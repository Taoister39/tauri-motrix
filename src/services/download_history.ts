import { DOWNLOAD_ENGINE } from "@/constant/task";
import { getMotrixDB } from "@/services/database";

export interface DownloadHistory {
  id: number;
  link: string;
  path: string;
  engine: DOWNLOAD_ENGINE;
  name: string;
  created_at: number;
  updated_at: number;
}

export type DownloadHistoryDto = Omit<
  DownloadHistory,
  "id" | "created_at" | "updated_at"
>;

export async function createHistory(history: DownloadHistoryDto) {
  const db = await getMotrixDB();

  return await db.execute(
    "INSERT INTO download_history (link, path, engine, name) VALUES (?, ?, ?, ?)",
    [history.link, history.path, history.engine, history.name],
  );
}

export async function findManyHistory() {
  const db = await getMotrixDB();

  return await db.select<DownloadHistory[]>(
    "SELECT id, link, path, engine, name, created_at FROM download_history ORDER BY created_at DESC LIMIT 10",
  );
}

export async function findOneHistory(id: DownloadHistory["id"]) {
  const db = await getMotrixDB();

  return await db.select<DownloadHistory[]>(
    "SELECT id, link, path, engine, name, created_at, updated_at FROM download_history WHERE id = ?",
    [id],
  );
}

// export async function updateHistory(
//   id: DownloadHistory["id"],
//   history: DownloadHistoryDto,
// ) {
//   const db = await getMotrixDB();

//   return db.execute(
//     "UPDATE download_history SET link = ?, path = ?, engine = ?, name = ? WHERE id = ?",
//     [history.link, history.path, history.engine, history.name, id],
//   );
// }

export async function deleteHistory(id: DownloadHistory["id"]) {
  const db = await getMotrixDB();

  return await db.execute("DELETE FROM download_history WHERE id = ?", [id]);
}
