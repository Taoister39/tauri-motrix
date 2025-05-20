import Database from "@tauri-apps/plugin-sql";

import { isProd } from "@/constant/environment";

export async function getMotrixDB() {
  const db = await Database.load(
    isProd ? "sqlite:motrix.db" : "sqlite:motrix_test.db",
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS download_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT NOT NULL CHECK(length(link) > 0),
        path TEXT NOT NULL CHECK(length(path) > 0),
        engine TEXT NOT NULL CHECK(length(engine) > 0),
        name TEXT NOT NULL CHECK(length(name) > 0),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()), 
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
  );
  return db;
}
