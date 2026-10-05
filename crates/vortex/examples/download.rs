use tauri_motrix_vortex::{DownloadRequest, Engine, EngineConfig, TaskState};
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = std::env::args()
        .nth(1)
        .ok_or("Usage: download URL [directory]")?;
    let directory = std::env::args().nth(2).unwrap_or_else(|| ".".into()).into();
    let engine = Engine::open(".vortex", EngineConfig::default()).await?;
    let id = engine
        .add(DownloadRequest {
            url,
            directory,
            filename: None,
            headers: Default::default(),
            referer: None,
        })
        .await?;
    loop {
        let task = engine.get(&id).await?;
        println!("{:?}: {} / {:?}", task.state, task.completed, task.total);
        if matches!(task.state, TaskState::Complete | TaskState::Failed) {
            engine.shutdown().await?;
            if let Some(error) = task.error {
                return Err(error.into());
            }
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    Ok(())
}
