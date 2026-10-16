import {
  Alert,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { BaseDialog } from "@/components/BaseDialog";
import { isMac } from "@/constant/environment";
import type { ShortcutRecorderState } from "@/hooks/shortcut_recorder";
import { formatShortcut, recordShortcut } from "@/utils/shortcuts";

interface Props {
  state: Extract<ShortcutRecorderState, { editor: unknown }>;
  onRecord: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ShortcutRecorderDialog({
  state,
  onRecord,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const { phase, editor } = state;
  const pending =
    phase === "starting" || phase === "saving" || phase === "stopping";
  useEffect(() => {
    if (phase === "recording") input.current?.focus();
  }, [phase]);

  return (
    <BaseDialog
      open
      title={t("shortcuts.EditAction", {
        action: t(`shortcuts.${editor.action.label}`),
      })}
      onClose={() => {
        if (phase !== "saving" && phase !== "stopping") onCancel();
      }}
      onCancel={onCancel}
      cancelBtn={
        phase === "restore_failed" ? t("shortcuts.RetryRestore") : undefined
      }
      disableCancel={phase === "saving" || phase === "stopping"}
      disableOk={phase !== "recording" || !editor.candidate}
      onOk={onConfirm}
      fullWidth
      maxWidth="xs"
    >
      <TextField
        inputRef={input}
        fullWidth
        label={t("shortcuts.Combination")}
        value={editor.candidate ? formatShortcut(editor.candidate, isMac) : ""}
        helperText={t("shortcuts.RecordHint")}
        disabled={phase !== "recording"}
        slotProps={{ input: { readOnly: true } }}
        sx={{ mt: 1 }}
        onKeyDown={(event) => {
          if (event.key === "Escape" || event.key === "Tab") return;
          event.preventDefault();
          if (event.repeat) return;
          const value = recordShortcut(event);
          if (value) onRecord(value);
        }}
      />
      {pending && (
        <Box
          role="status"
          sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}
        >
          <CircularProgress size={16} />
          <Typography variant="body2">{t(`shortcuts.${phase}`)}</Typography>
        </Box>
      )}
      {editor.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(`shortcuts.Errors.${editor.error}`)}
        </Alert>
      )}
    </BaseDialog>
  );
}
