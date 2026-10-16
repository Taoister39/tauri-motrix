import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { GlobalShortcutRow } from "@/business/setting/GlobalShortcutRow";
import { ShortcutRecorderDialog } from "@/business/setting/ShortcutRecorderDialog";
import { SettingList } from "@/client/setting_compose";
import { GLOBAL_SHORTCUT_ACTIONS } from "@/constant/shortcuts";
import { useShortcutRecorder } from "@/hooks/shortcut_recorder";
import { useGlobalShortcutSettings } from "@/hooks/shortcuts";

export default function GlobalShortcutSetting() {
  const { t } = useTranslation();
  const settings = useGlobalShortcutSettings();
  const recorder = useShortcutRecorder(settings.save);
  const { state } = recorder;
  const { data } = settings;
  const unavailable = data && !data.status.available;

  return (
    <Box sx={{ containerType: "inline-size", minWidth: 0 }}>
      <SettingList title={t("shortcuts.Title")}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, pb: 1 }}
        >
          {t("shortcuts.Description")}
        </Typography>
        {settings.isLoading && (
          <Box role="status" sx={{ px: 2 }}>
            <CircularProgress size={20} aria-label={t("shortcuts.Loading")} />
          </Box>
        )}
        {settings.error && (
          <Alert
            severity="error"
            sx={{ mx: 2, mb: 1 }}
            action={
              <Button
                color="inherit"
                size="small"
                disabled={settings.isValidating}
                onClick={() => void settings.refresh().catch(() => {})}
              >
                {t("shortcuts.Retry")}
              </Button>
            }
          >
            {t("shortcuts.StatusFailed")}
          </Alert>
        )}
        {unavailable && (
          <Alert severity="info" sx={{ mx: 2, mb: 1 }}>
            {t("shortcuts.Errors.unavailable")}
          </Alert>
        )}
        {data &&
          GLOBAL_SHORTCUT_ACTIONS.map((action) => (
            <GlobalShortcutRow
              key={action.key}
              action={action}
              value={data.config?.[action.key] ?? ""}
              binding={data.status[action.status]}
              available={data.status.available && !!data.config}
              disabled={state.phase !== "idle" || !!settings.error}
              clearing={
                state.phase === "clearing" && state.action.key === action.key
              }
              onEdit={() => void recorder.start(action)}
              onClear={() => void recorder.clear(action)}
            />
          ))}
        {state.phase === "idle" && state.error && (
          <Alert severity="error" sx={{ mx: 2 }}>
            {t(`shortcuts.Errors.${state.error}`)}
          </Alert>
        )}
        {"editor" in state && (
          <ShortcutRecorderDialog
            state={state}
            onRecord={recorder.record}
            onCancel={() => void recorder.cancel()}
            onConfirm={() => void recorder.confirm()}
          />
        )}
      </SettingList>
    </Box>
  );
}
