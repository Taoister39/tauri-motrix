import Database from "@tauri-apps/plugin-sql";

import { isProd } from "@/constant/environment";

let motrixPromise: Promise<Database> = null!;

async function getMotrixPromise() {
  const db = await Database.load(
    isProd ? "sqlite:motrix.db" : "sqlite:motrix_test.db",
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS download_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT NOT NULL CHECK(length(link) > 0),
        path TEXT NOT NULL CHECK(length(path) > 0),
        engine TEXT NOT NULL CHECK(length(engine) > 0),
        status TEXT CHECK(length(engine) > 0),
        name TEXT NOT NULL CHECK(length(name) > 0),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        total_length INTEGER NOT NULL CHECK(total_length >= 0),
        plat_id TEXT NOT NULL,
        json_ext TEXT
      )`,
  );

  await db.execute(`CREATE TABLE IF NOT EXISTS save_to_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dir TEXT NOT NULL CHECK(length(dir) > 0),
        engine TEXT NOT NULL CHECK(length(engine) > 0),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        is_star INTEGER NOT NULL DEFAULT 0
      )`);

  return db;
}

export async function getMotrixDB(force = false) {
  if (!motrixPromise || force) {
    motrixPromise?.then((db) => db.close());
    motrixPromise = getMotrixPromise();
  }
  return motrixPromise;
}
