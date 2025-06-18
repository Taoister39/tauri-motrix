import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import { Peer, taskItemWithPeers } from "@/services/aria2c_api";
import { bitfieldToPercent, parseByteVo, peerIdParser } from "@/utils/download";

function TaskClientPanel(props: { gid: string }) {
  const { t } = useTranslation();

  const { data } = useSWR(
    "taskDetailWithPeers",
    () => taskItemWithPeers(props.gid),
    {
      refreshInterval: 1000,
    },
  );

  const peers = useMemo(() => {
    const originPeers = data?.[1]?.[0];
    return originPeers ?? [];
  }, [data]);

  const columns = useMemo<GridColDef<Peer>[]>(
    () => [
      {
        field: "peerOrigin",
        headerName: t("task.PeerHost"),
        sortable: false,
        renderCell(params) {
          const { port, ip } = params.row;
          return `${ip}:${port}`;
        },
        width: 150,
      },
      {
        field: "peerId",
        headerName: t("task.PeerClient"),
        valueFormatter: (value: string) => peerIdParser(value),
      },
      {
        field: "percent",
        headerName: "%",
        renderCell(params) {
          return bitfieldToPercent(params.row.bitfield);
        },
      },
      {
        field: "uploadSpeed",
        headerName: "↑",
        valueFormatter: (value: string) => parseByteVo(value).join(""),
      },
      {
        field: "downloadSpeed",
        headerName: "↓",
        valueFormatter: (value: string) => parseByteVo(value).join(""),
      },
    ],
    [t],
  );

  return (
    <DataGrid
      columns={columns}
      rows={peers}
      getRowId={(row) => `${row.ip}:${row.port}`}
    />
  );
}

export default TaskClientPanel;
