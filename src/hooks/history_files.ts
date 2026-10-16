import useSWR from "swr";

import type { DownloadHistoryVO } from "@/services/download_history";
import {
  type HistoryFileInspection,
  inspectHistoryPaths,
} from "@/services/history_files";

export function useHistoryFiles(history: DownloadHistoryVO[]) {
  const paths = [...new Set(history.map((item) => item.path))];

  const { data: files = new Map<string, HistoryFileInspection>() } = useSWR(
    ["useHistoryFiles", paths],
    async ([, paths]) => {
      const results = new Map<string, HistoryFileInspection>();
      for (let offset = 0; offset < paths.length; offset += 128) {
        const batch = paths.slice(offset, offset + 128);
        const inspections = await inspectHistoryPaths(batch).catch(() =>
          batch.map(
            (path): HistoryFileInspection => ({
              path,
              state: "unknown",
              kind: null,
              revision: null,
            }),
          ),
        );
        for (const inspection of inspections) {
          results.set(inspection.path, inspection);
        }
      }
      return results;
    },
  );

  return files;
}
