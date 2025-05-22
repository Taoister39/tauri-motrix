import { DOWNLOAD_ENGINE } from "@/constant/task";
import { getMotrixDB } from "@/services/database";

export interface DownloadHistory {
  id: number;
  link: string;
  path: string;
  engine: DOWNLOAD_ENGINE;
  name: string;
  downloaded_at: number;
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
  "link" | "path" | "engine" | "name" | "total_length" | "plat_id"
>;

export async function createHistory(
  history: DownloadHistoryDTO,
  json_ext?: DownloadHistoryExt,
) {
  const db = await getMotrixDB();

  if (json_ext) {
    return db.execute(
      "INSERT INTO download_history (link, path, engine, name, total_length, plat_id, json_ext) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        history.link,
        history.path,
        history.engine,
        history.name,
        history.total_length,
        history.plat_id,
        JSON.stringify(json_ext),
      ],
    );
  }

  return db.execute(
    "INSERT INTO download_history (link, path, engine, name, total_length, plat_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      history.link,
      history.path,
      history.engine,
      history.name,
      history.total_length,
      history.plat_id,
    ],
  );
}

export async function findManyHistory(): Promise<DownloadHistoryVO[]> {
  const db = await getMotrixDB();

  const result = await db.select<DownloadHistory[]>(
    "SELECT id, link, path, engine, name, downloaded_at, total_length, plat_id, json_ext FROM download_history ORDER BY downloaded_at DESC",
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
    "SELECT id, link, path, engine, name, downloaded_at, total_length, plat_id, json_ext FROM download_history WHERE plat_id = $1 ORDER BY downloaded_at DESC LIMIT 1",
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
  history: DownloadHistoryDTO,
) {
  const db = await getMotrixDB();

  return db.execute(
    "UPDATE download_history SET total_length = $1 WHERE plat_id = $2",
    [history.total_length, id],
  );
}

export async function deleteHistory(id: DownloadHistory["id"]) {
  const db = await getMotrixDB();

  return await db.execute("DELETE FROM download_history WHERE id = ?", [id]);
}
