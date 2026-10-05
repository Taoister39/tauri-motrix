use crate::{model::Record, Result};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    SqlitePool,
};
use std::path::Path;

pub(crate) async fn open(path: &Path) -> Result<SqlitePool> {
    tokio::fs::create_dir_all(path).await?;
    let options = SqliteConnectOptions::new()
        .filename(path.join("vortex.db"))
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Full);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, record TEXT NOT NULL)")
        .execute(&pool)
        .await?;
    Ok(pool)
}
pub(crate) async fn load(pool: &SqlitePool) -> Result<Vec<Record>> {
    let rows: Vec<(String,)> = sqlx::query_as("SELECT record FROM tasks ORDER BY rowid")
        .fetch_all(pool)
        .await?;
    rows.into_iter()
        .map(|(s,)| {
            let r: Record = serde_json::from_str(&s)?;
            if r.version != 1 {
                return Err(crate::DownloadError::new(
                    "state_version",
                    "Unsupported Vortex state version",
                ));
            }
            Ok(r)
        })
        .collect()
}
pub(crate) async fn save(pool: &SqlitePool, record: &Record) -> Result<()> {
    sqlx::query("INSERT INTO tasks(id,record) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record")
        .bind(&record.task.id).bind(serde_json::to_string(record)?).execute(pool).await?;
    Ok(())
}
