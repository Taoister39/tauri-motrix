import { useLockFn } from "ahooks";
import { useCallback } from "react";
import useSWR from "swr";

import { getMotrixConfig, patchMotrixConfig } from "@/services/cmd";

export function useMotrix() {
  const { data: motrix, mutate: mutateMotrix } = useSWR(
    "getMotrixConfig",
    getMotrixConfig,
  );

  const patchMotrixMemoizedFn = useCallback(
    async (data: Parameters<typeof patchMotrixConfig>[0]) => {
      await patchMotrixConfig(data);
      mutateMotrix();
    },
    [mutateMotrix],
  );
  const patchMotrix = useLockFn(patchMotrixMemoizedFn);

  return {
    motrix,
    mutateMotrix,
    patchMotrix,
  };
}
