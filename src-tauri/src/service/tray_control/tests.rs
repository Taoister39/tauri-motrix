use super::*;
use std::sync::Mutex;

#[derive(Default)]
struct MockBackend {
    calls: Mutex<Vec<(EngineKind, String, ControlAction)>>,
    unavailable: bool,
    control_failure: bool,
}

impl Backend for MockBackend {
    async fn list(&self, engine: EngineKind) -> Result<Vec<ControlTask>, ()> {
        if self.unavailable && engine == EngineKind::Aria2c {
            return Err(());
        }
        Ok([
            "active", "waiting", "paused", "error", "complete", "removed",
        ]
        .into_iter()
        .map(|status| ControlTask {
            id: status.into(),
            status: status.into(),
        })
        .collect())
    }

    async fn control(
        &self,
        engine: EngineKind,
        id: &str,
        action: ControlAction,
    ) -> Result<bool, FailureReason> {
        self.calls.lock().unwrap().push((engine, id.into(), action));
        if self.control_failure && id == "active" {
            return Err(FailureReason::ControlFailed);
        }
        if engine == EngineKind::Aria2c && id == "waiting" {
            return Err(FailureReason::DeletionPending);
        }
        Ok(true)
    }
}

#[tokio::test]
async fn pause_covers_both_engines_and_reports_skipped_deletions() {
    let backend = MockBackend::default();
    let report = run_with(ControlAction::Pause, &backend).await;
    assert_eq!(report.succeeded, 3);
    assert_eq!(report.failures.len(), 1);
    assert_eq!(report.failures[0].reason, FailureReason::DeletionPending);
    assert_eq!(backend.calls.lock().unwrap().len(), 4);
}

#[tokio::test]
async fn resume_only_targets_paused_tasks() {
    let backend = MockBackend::default();
    let report = run_with(ControlAction::Resume, &backend).await;
    assert_eq!(report.succeeded, 2);
    assert!(report.failures.is_empty());
    assert!(backend
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|(_, id, _)| id == "paused"));
}

#[tokio::test]
async fn an_unavailable_engine_does_not_block_the_other() {
    let report = run_with(
        ControlAction::Pause,
        &MockBackend {
            unavailable: true,
            ..Default::default()
        },
    )
    .await;
    assert_eq!(report.succeeded, 2);
    assert_eq!(report.failures[0].reason, FailureReason::Unavailable);
}

#[tokio::test]
async fn task_failures_do_not_interrupt_remaining_tasks() {
    let backend = MockBackend {
        control_failure: true,
        ..Default::default()
    };
    let report = run_with(ControlAction::Pause, &backend).await;
    assert_eq!(report.succeeded, 1);
    assert_eq!(report.failures.len(), 3);
    assert_eq!(backend.calls.lock().unwrap().len(), 4);
}

#[tokio::test]
async fn waiting_tasks_are_fully_paginated_before_control() {
    let offsets = Mutex::new(Vec::new());
    let tasks = aria_tasks_with(|name, params| {
        let result = if name == "tellActive" {
            json!([])
        } else {
            let offset = params[0].as_u64().unwrap();
            offsets.lock().unwrap().push(offset);
            let count = if offset == 0 { 256 } else { 2 };
            Value::Array(
                (offset..offset + count)
                    .map(|id| json!({ "gid": id.to_string(), "status": "paused" }))
                    .collect(),
            )
        };
        async move { Ok(result) }
    })
    .await
    .unwrap();
    assert_eq!(tasks.len(), 258);
    assert_eq!(*offsets.lock().unwrap(), [0, 256]);
}

#[tokio::test]
async fn empty_engines_are_a_successful_no_op() {
    struct Empty;
    impl Backend for Empty {
        async fn list(&self, _: EngineKind) -> Result<Vec<ControlTask>, ()> {
            Ok(vec![])
        }
        async fn control(
            &self,
            _: EngineKind,
            _: &str,
            _: ControlAction,
        ) -> Result<bool, FailureReason> {
            panic!("No task should be controlled");
        }
    }
    let report = run_with(ControlAction::Pause, &Empty).await;
    assert_eq!(report.succeeded, 0);
    assert!(report.failures.is_empty());
}

#[test]
fn vortex_terminal_states_are_never_selected() {
    for state in [TaskState::Failed, TaskState::Complete, TaskState::Removed] {
        assert!(!ControlAction::Pause.accepts(vortex_status(state)));
        assert!(!ControlAction::Resume.accepts(vortex_status(state)));
    }
    for state in [
        TaskState::Queued,
        TaskState::Connecting,
        TaskState::Downloading,
        TaskState::RetryWaiting,
    ] {
        assert!(ControlAction::Pause.accepts(vortex_status(state)));
    }
}
