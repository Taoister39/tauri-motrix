use std::{collections::HashSet, future::Future};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri_motrix_vortex::TaskState;

use super::{
    aria2c,
    task_deletion::{self, EngineKind},
    vortex,
};

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ControlAction {
    Pause,
    Resume,
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FailureReason {
    Unavailable,
    ControlFailed,
    DeletionPending,
}

#[derive(Clone, Debug, Serialize)]
pub struct ControlFailure {
    pub engine: EngineKind,
    pub id: Option<String>,
    pub reason: FailureReason,
}

#[derive(Clone, Debug, Serialize)]
pub struct ControlReport {
    pub action: ControlAction,
    pub succeeded: usize,
    pub failures: Vec<ControlFailure>,
}

#[derive(Clone, Deserialize)]
struct ControlTask {
    #[serde(alias = "gid")]
    id: String,
    status: String,
}

impl ControlAction {
    fn accepts(self, status: &str) -> bool {
        match self {
            Self::Pause => matches!(status, "active" | "waiting"),
            Self::Resume => status == "paused",
        }
    }
}

fn vortex_status(state: TaskState) -> &'static str {
    match state {
        TaskState::Queued => "waiting",
        TaskState::Connecting | TaskState::Downloading | TaskState::RetryWaiting => "active",
        TaskState::Paused => "paused",
        _ => "stopped",
    }
}

async fn aria_tasks_with<F, Fut>(mut rpc: F) -> Result<Vec<ControlTask>, ()>
where
    F: FnMut(&'static str, Vec<Value>) -> Fut,
    Fut: Future<Output = Result<Value, ()>>,
{
    let keys = json!(["gid", "status"]);
    let mut tasks: Vec<ControlTask> =
        serde_json::from_value(rpc("tellActive", vec![keys.clone()]).await?).map_err(|_| ())?;
    let mut offset = 0;
    loop {
        let page: Vec<ControlTask> = serde_json::from_value(
            rpc("tellWaiting", vec![json!(offset), json!(256), keys.clone()]).await?,
        )
        .map_err(|_| ())?;
        let count = page.len();
        tasks.extend(page);
        if count < 256 {
            break;
        }
        offset += count;
    }
    let mut seen = HashSet::new();
    tasks.retain(|task| seen.insert(task.id.clone()));
    Ok(tasks)
}

async fn rpc(name: &str, params: &[Value]) -> Result<Value, ()> {
    aria2c::call(name, params)
        .await
        .map_err(|_| ())?
        .get("result")
        .cloned()
        .ok_or(())
}

trait Backend: Sync {
    fn list(&self, engine: EngineKind)
        -> impl Future<Output = Result<Vec<ControlTask>, ()>> + Send;
    fn control(
        &self,
        engine: EngineKind,
        id: &str,
        action: ControlAction,
    ) -> impl Future<Output = Result<bool, FailureReason>> + Send;
}

struct SystemBackend;

impl Backend for SystemBackend {
    async fn list(&self, engine: EngineKind) -> Result<Vec<ControlTask>, ()> {
        match engine {
            EngineKind::Aria2c => {
                aria_tasks_with(|name, params| async move { rpc(name, &params).await }).await
            }
            EngineKind::Vortex => Ok(vortex::engine()
                .await
                .map_err(|_| ())?
                .list()
                .await
                .into_iter()
                .map(|task| ControlTask {
                    id: task.id,
                    status: vortex_status(task.state).into(),
                })
                .collect()),
        }
    }

    async fn control(
        &self,
        engine: EngineKind,
        id: &str,
        action: ControlAction,
    ) -> Result<bool, FailureReason> {
        let _guard = task_deletion::control_guard_for(engine, id)
            .await
            .map_err(|_| FailureReason::DeletionPending)?;
        let result = async {
            match engine {
                EngineKind::Aria2c => {
                    let task = rpc("tellStatus", &[json!(id), json!(["status"])]).await?;
                    if !action.accepts(task["status"].as_str().ok_or(())?) {
                        return Ok(false);
                    }
                    rpc(
                        match action {
                            ControlAction::Pause => "pause",
                            ControlAction::Resume => "unpause",
                        },
                        &[json!(id)],
                    )
                    .await?;
                }
                EngineKind::Vortex => {
                    let engine = vortex::engine().await.map_err(|_| ())?;
                    let task = engine.get(id).await.map_err(|_| ())?;
                    if !action.accepts(vortex_status(task.state)) {
                        return Ok(false);
                    }
                    match action {
                        ControlAction::Pause => engine.pause(id).await,
                        ControlAction::Resume => engine.resume(id).await,
                    }
                    .map_err(|_| ())?;
                }
            }
            Ok(true)
        }
        .await;
        result.map_err(|()| FailureReason::ControlFailed)
    }
}

async fn run_with(action: ControlAction, backend: &impl Backend) -> ControlReport {
    let mut report = ControlReport {
        action,
        succeeded: 0,
        failures: Vec::new(),
    };
    let (aria, vortex) = tokio::join!(
        backend.list(EngineKind::Aria2c),
        backend.list(EngineKind::Vortex)
    );
    for (engine, result) in [(EngineKind::Aria2c, aria), (EngineKind::Vortex, vortex)] {
        let tasks = match result {
            Ok(tasks) => tasks,
            Err(()) => {
                report.failures.push(ControlFailure {
                    engine,
                    id: None,
                    reason: FailureReason::Unavailable,
                });
                continue;
            }
        };
        for task in tasks
            .into_iter()
            .filter(|task| action.accepts(&task.status))
        {
            match backend.control(engine, &task.id, action).await {
                Ok(true) => report.succeeded += 1,
                Ok(false) => {}
                Err(reason) => report.failures.push(ControlFailure {
                    engine,
                    id: Some(task.id),
                    reason,
                }),
            }
        }
    }
    report
}

pub async fn run(action: ControlAction) -> ControlReport {
    run_with(action, &SystemBackend).await
}

#[cfg(test)]
mod tests;
