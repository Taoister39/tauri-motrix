import ClearIcon from "@mui/icons-material/Clear";
import {
  Box,
  Button,
  IconButton,
  ListItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { isMac } from "@/constant/environment";
import type { GlobalShortcutAction } from "@/constant/shortcuts";
import type { ShortcutStatus } from "@/services/shortcuts";
import { formatShortcut } from "@/utils/shortcuts";

interface Props {
  action: GlobalShortcutAction;
  value: string;
  binding: ShortcutStatus["show_window"];
  available: boolean;
  disabled: boolean;
  clearing: boolean;
  onEdit: () => void;
  onClear: () => void;
}

export function GlobalShortcutRow({
  action,
  value,
  binding,
  available,
  disabled,
  clearing,
  onEdit,
  onClear,
}: Props) {
  const { t } = useTranslation();
  const label = t(`shortcuts.${action.label}`);
  const error = binding.error === "unavailable" ? null : binding.error;
  return (
    <ListItem
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 1,
        py: 1.5,
        "@container (min-width: 440px)": {
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
        },
      }}
    >
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        {label}
      </Typography>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}
      >
        <Button
          variant="outlined"
          size="small"
          aria-label={t("shortcuts.EditAction", { action: label })}
          disabled={disabled || !available || binding.error === "not_ready"}
          onClick={onEdit}
          sx={{
            flex: 1,
            minWidth: 0,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            textTransform: "none",
          }}
        >
          {value ? formatShortcut(value, isMac) : t("shortcuts.Unbound")}
        </Button>
        <Tooltip title={t("shortcuts.Clear")}>
          <span>
            <IconButton
              size="small"
              aria-label={t("shortcuts.ClearAction", { action: label })}
              disabled={disabled || !value}
              loading={clearing}
              onClick={onClear}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {(error || (value && binding.active)) && (
        <Typography
          variant="caption"
          color={error ? "error" : "text.secondary"}
          sx={{ gridColumn: "1 / -1", overflowWrap: "anywhere" }}
        >
          {error ? t(`shortcuts.Errors.${error}`) : t("shortcuts.Active")}
        </Typography>
      )}
    </ListItem>
  );
}
