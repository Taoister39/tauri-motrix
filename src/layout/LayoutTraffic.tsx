import { ArrowDownwardRounded, ArrowUpwardRounded } from "@mui/icons-material";
import { Box, styled, Typography } from "@mui/material";
import { useDocumentVisibility } from "ahooks";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import TrafficGraph, { TrafficRef } from "@/layout/TrafficGraph";
import { useAria2StateStore } from "@/store/aria2_state";
import { parseByteVo } from "@/utils/download";

const SpeedIndicatorRow = styled("section")(() => ({
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  "& .MuiSvgIcon-root": {
    mr: "8px",
    fontSize: 16,
  },
}));

const SpeedValue = styled(Typography)(() => ({
  flex: "1 1 56px",
  userSelect: "none",
  textAlign: "center",
}));

const SpeedUnit = styled(Typography)(() => ({
  flex: "0 1 27px",
  userSelect: "none",
  color: "grey.500",
  fontSize: "12px",
  textAlign: "right",
}));

function LayoutTraffic() {
  const { t } = useTranslation();

  const stat = useAria2StateStore((state) => state.globalStat);

  const trafficRef = useRef<TrafficRef>(null);

  const [up, upUnit] = parseByteVo(stat.uploadSpeed, "/s");
  const [down, downUnit] = parseByteVo(stat.downloadSpeed, "/s");

  const documentVisibility = useDocumentVisibility();

  useEffect(() => {
    const up = +stat.uploadSpeed || 0;
    const down = +stat.downloadSpeed || 0;

    trafficRef.current?.appendData({ up, down });
  }, [stat]);

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{ mb: 0.75, cursor: "pointer" }}
        onClick={() => trafficRef.current?.toggleStyle()}
      >
        {documentVisibility === "visible" && <TrafficGraph ref={trafficRef} />}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <SpeedIndicatorRow title={t("common.UploadSpeed")}>
          <ArrowUpwardRounded color={+up > 0 ? "secondary" : "disabled"} />
          <SpeedValue color="secondary">{up}</SpeedValue>
          <SpeedUnit>{upUnit}</SpeedUnit>
        </SpeedIndicatorRow>

        <SpeedIndicatorRow title={t("common.DownloadSpeed")}>
          <ArrowDownwardRounded color={+down > 0 ? "primary" : "disabled"} />
          <SpeedValue color="primary">{down}</SpeedValue>
          <SpeedUnit>{downUnit}</SpeedUnit>
        </SpeedIndicatorRow>
      </Box>
    </Box>
  );
}

export default LayoutTraffic;
