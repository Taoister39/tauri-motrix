import { DOWNLOAD_ENGINE } from "@/constant/task";
import { getMotrixDB } from "@/services/database";

export interface DownloadHistory {
  id: number;
  link: string;
  path: string;
  engine: DOWNLOAD_ENGINE;
  status?: string;
  name: string;
  created_at: number;
  updated_at: number;
  total_length: number; // File size in bytes
  /**
   * aria2c -> gid
   */
  plat_id: string;
  json_ext?: string;
}

export type DownloadHistoryExt = {
  // aria2c gid
  plat_gid?: string;
};

export type DownloadHistoryVO = Omit<DownloadHistory, "ext"> & {
  json_ext: DownloadHistoryExt;
};

export type DownloadHistoryDTO = Pick<
  DownloadHistory,
  "link" | "path" | "engine" | "name" | "total_length" | "plat_id" | "status"
>;

export async function createHistory(
  dto: DownloadHistoryDTO,
  json_ext?: DownloadHistoryExt,
) {
  const db = await getMotrixDB();

  const values = [
    dto.link,
    dto.path,
    dto.engine,
    dto.name,
    dto.total_length,
    dto.plat_id,
  ];

  const columns = ["link", "path", "engine", "name", "total_length", "plat_id"];

  if (json_ext) {
    values.push(JSON.stringify(json_ext));
    columns.push("json_ext");
  }

  if (dto.status) {
    values.push(dto.status);
    columns.push("status");
  }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  return db.execute(
    `INSERT INTO download_history (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
}

export async function findManyHistory(): Promise<DownloadHistoryVO[]> {
  const db = await getMotrixDB();

  const result = await db.select<DownloadHistory[]>(
    "SELECT id, link, path, engine, name, created_at, total_length, plat_id, json_ext FROM download_history ORDER BY created_at DESC",
  );

  return result.map(
    (item) =>
      ({
        ...item,
        json_ext: item.json_ext ? JSON.parse(item.json_ext) : {},
      }) as DownloadHistoryVO,
  );
}

export async function findOneHistoryByPlatId(
  id: string,
): Promise<DownloadHistoryVO | undefined> {
  const db = await getMotrixDB();

  const result = await db.select<DownloadHistory[]>(
    "SELECT id, link, path, engine, name, created_at, total_length, plat_id, json_ext FROM download_history WHERE plat_id = $1 ORDER BY created_at DESC LIMIT 1",
    [id],
  );

  if (result.length > 0) {
    const resultOne = result[0];

    return {
      ...resultOne,
      json_ext: resultOne.json_ext ? JSON.parse(resultOne.json_ext) : {},
    } as DownloadHistoryVO;
  }
}

export async function updateHistoryByPlatId(
  id: string,
  dto: Partial<DownloadHistoryDTO>,
) {
  const db = await getMotrixDB();

  const updates: string[] = [];
  const values: Array<string | number> = [];
  let paramIndex = 1;

  if (dto.link !== undefined) {
    updates.push(`link = $${paramIndex++}`);
    values.push(dto.link);
  }
  if (dto.path !== undefined) {
    updates.push(`path = $${paramIndex++}`);
    values.push(dto.path);
  }
  if (dto.engine !== undefined) {
    updates.push(`engine = $${paramIndex++}`);
    values.push(dto.engine);
  }
  if (dto.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(dto.name);
  }
  if (dto.total_length !== undefined) {
    updates.push(`total_length = $${paramIndex++}`);
    values.push(dto.total_length);
  }
  if (dto.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(dto.status);
  }

  if (updates.length === 0) {
    // No fields to update
    return;
  }

  values.push(id); // Add id for the WHERE clause

  const setClause = updates.join(", ");

  return db.execute(
    `UPDATE download_history SET ${setClause} WHERE plat_id = $${paramIndex}`,
    values,
  );
}

export async function deleteHistory(id: DownloadHistory["id"]) {
  const db = await getMotrixDB();

  return await db.execute("DELETE FROM download_history WHERE id = ?", [id]);
}
