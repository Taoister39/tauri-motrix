import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

import type { Preferences } from "./model";
export function Settings({
  preferences,
  busy,
  onSave,
  onConnect,
}: {
  preferences: Preferences;
  busy: boolean;
  onSave: (p: Preferences, secret?: string) => Promise<void>;
  onConnect: () => Promise<void>;
}) {
  const [port, setPort] = useState(String(preferences.port));
  const [secret, setSecret] = useState("");
  const [replaceSecret, setReplaceSecret] = useState(false);
  const [theme, setTheme] = useState(preferences.theme);
  const validPort =
    /^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535;
  return (
    <Stack
      spacing={2.5}
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (validPort)
          void onSave(
            { ...preferences, port: Number(port), theme },
            replaceSecret ? secret : undefined,
          );
      }}
    >
      <Box>
        <Typography variant="overline" color="primary.main">
          MAKE YOURSELF AT HOME
        </Typography>
        <Typography variant="h1" sx={{ mt: 0.5 }}>
          Your connection
          <Box component="span" color="secondary.main">
            {" "}
            ✦
          </Box>
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>
          Pair with the aria2 RPC service inside Motrix.
        </Typography>
      </Box>
      <TextField
        label="Local RPC port"
        value={port}
        onChange={(e) => setPort(e.target.value)}
        error={!validPort}
        helperText={
          validPort
            ? "Motrix → Settings → RPC. Default: 16801."
            : "Enter a port between 1 and 65535."
        }
        slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 5 } }}
      />
      <TextField
        label="RPC secret"
        type="password"
        value={secret}
        onChange={(e) => {
          setSecret(e.target.value);
          setReplaceSecret(true);
        }}
        autoComplete="off"
        helperText={
          replaceSecret
            ? "Saved for this browser session only."
            : "Leave unchanged to keep the current session secret."
        }
        slotProps={{ htmlInput: { maxLength: 4096 } }}
      />
      <Button
        size="small"
        variant="text"
        onClick={() => {
          setSecret("");
          setReplaceSecret(true);
        }}
      >
        Clear saved secret on save
      </Button>
      <TextField
        select
        label="Appearance"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Preferences["theme"])}
      >
        <MenuItem value="system">Follow system</MenuItem>
        <MenuItem value="light">Light festival</MenuItem>
        <MenuItem value="dark">Night festival</MenuItem>
      </TextField>
      <Alert severity="info" sx={{ fontSize: 11 }}>
        Uses 127.0.0.1 on this device. Resource URLs stay in browser session
        storage and are cleared when their tab closes or navigates.
      </Alert>
      <Stack direction="row" sx={{ gap: 1 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={busy || !validPort}
          fullWidth
        >
          Save settings
        </Button>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => {
            void onConnect();
          }}
          fullWidth
        >
          Test connection
        </Button>
      </Stack>
      <Typography color="text.secondary" sx={{ fontSize: 11 }}>
        Save changes before testing. Signed-in downloads may need cookies or
        headers; this version never copies those credentials. HLS / DASH
        assembly is not supported by this extension.
      </Typography>
    </Stack>
  );
}
