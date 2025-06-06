import { DOWNLOAD_ENGINE } from "@/constant/task";
import { getMotrixDB } from "@/services/database";

export interface SaveToHistory {
  id: number;
  dir: string;
  engine: DOWNLOAD_ENGINE;
  created_at: number;
  updated_at: number;
  is_star: number;
}

export async function findManyDir(): Promise<SaveToHistory[]> {
  const db = await getMotrixDB();
  return db.select<SaveToHistory[]>(
    "SELECT id, dir, engine, created_at, updated_at, is_star FROM save_to_history ORDER BY created_at DESC",
  );
}

export async function deleteDir(id: SaveToHistory["id"]) {
  const db = await getMotrixDB();
  return await db.execute("DELETE FROM save_to_history WHERE id = ?", [id]);
}

export async function updateDir(
  id: SaveToHistory["id"],
  dto: {
    is_star: boolean;
  },
) {
  const db = await getMotrixDB();
  return db.execute(
    "UPDATE save_to_history SET is_star = $1, updated_at = unixepoch() WHERE id = $2",
    [dto.is_star ? 1 : 0, id],
  );
}

export async function addOneDir(dto: Pick<SaveToHistory, "dir" | "engine">) {
  const db = await getMotrixDB();
  return db.execute(
    "INSERT INTO save_to_history (dir, engine) VALUES ($1, $2)",
    [dto.dir, dto.engine],
  );
}

export async function findOneDirByPath(path: string) {
  const db = await getMotrixDB();
  const result = await db.select<SaveToHistory[]>(
    "SELECT id, dir, engine, created_at, updated_at, is_star FROM save_to_history WHERE dir = $1 ORDER BY created_at DESC LIMIT 1",
    [path],
  );

  if (result.length > 0) {
    return result[0];
  }
}
