import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FestivalBrand,
  FestivalHero,
  FestivalProvider,
  FestivalToggleCard,
} from "@tauri-motrix/ux-base/festival";
import { useState } from "react";

import { isExtension } from "./client";
import { formatSize, type Resource } from "./model";
import { ResourcePanel } from "./ResourcePanel";
import { Settings } from "./Settings";
import { useExtension } from "./useExtension";
export function App() {
  const app = useExtension();
  const { snapshot, busy } = app;
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Resource>();
  const [confirmClear, setConfirmClear] = useState(false);
  const chosen = snapshot.resources.filter(
    (r) => selected.includes(r.id) && !r.sent && r.kind !== "stream",
  );
  return (
    <FestivalProvider mode={snapshot.preferences.theme}>
      <Box
        className="extension-shell"
        sx={{ bgcolor: "background.default", color: "text.primary" }}
      >
        <Stack
          component="header"
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {settings ? (
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <IconButton
                aria-label="Back to resources"
                onClick={() => setSettings(false)}
              >
                <ArrowBackRounded />
              </IconButton>
              <Typography sx={{ fontWeight: 700 }}>Settings</Typography>
            </Stack>
          ) : (
            <FestivalBrand suffix="COMPANION" />
          )}
          <Stack direction="row" sx={{ gap: 0.25, alignItems: "center" }}>
            <Tooltip
              describeChild
              title={
                app.connected
                  ? "Connection last verified successfully"
                  : "Test your Motrix connection"
              }
            >
              <Button
                size="small"
                color={app.connected ? "success" : "primary"}
                disabled={busy}
                onClick={() => {
                  void app.connect();
                }}
                sx={{ minWidth: 0, fontSize: 10 }}
              >
                {app.connected ? "● Connected" : "○ Connect"}
              </Button>
            </Tooltip>
            {!settings && (
              <IconButton
                size="small"
                aria-label="Settings"
                onClick={() => setSettings(true)}
              >
                <SettingsOutlined fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>
        <Box
          component="main"
          sx={{ p: 2, overflowY: "auto", flex: 1, minHeight: 0 }}
        >
          {settings ? (
            <Settings
              preferences={snapshot.preferences}
              busy={busy}
              onSave={app.save}
              onConnect={app.connect}
            />
          ) : (
            <Stack spacing={1.75}>
              <FestivalHero
                eyebrow="YOUR LITTLE INTERNET UNIVERSE"
                title="Find it. Keep it."
                description="From your browser to your collection."
                artwork={{
                  src: "/assets/orbit-courier.webp",
                  alt: "Original Motrix space courier with a small companion robot",
                }}
              />
              {!isExtension && (
                <Alert severity="info" sx={{ fontSize: 11 }}>
                  Browser preview. Install the unpacked extension to capture
                  real resources and send downloads.
                </Alert>
              )}
              <FestivalToggleCard
                title="Download with Motrix"
                description={
                  snapshot.preferences.takeover
                    ? "Browser downloads go to your desktop."
                    : "Keep browser downloads in your browser."
                }
                checked={snapshot.preferences.takeover}
                disabled={busy || !isExtension}
                onChange={(takeover) => {
                  void app.save({ ...snapshot.preferences, takeover });
                }}
                icon={<DownloadRounded />}
              />
              {snapshot.notice && (
                <Alert severity="info" sx={{ fontSize: 11 }}>
                  {snapshot.notice}
                </Alert>
              )}
              <ResourcePanel
                snapshot={snapshot}
                busy={busy}
                loading={app.loading}
                selected={selected}
                setSelected={setSelected}
                onDetail={setDetail}
                onClear={() => setConfirmClear(true)}
                onToggleSniffing={() => {
                  void app.save({
                    ...snapshot.preferences,
                    sniffing: !snapshot.preferences.sniffing,
                  });
                }}
              />
              <Typography color="text.secondary" sx={{ fontSize: 10 }}>
                Current tab only · Up to 200 resources · No cookies collected
              </Typography>
            </Stack>
          )}
        </Box>
        {!settings && (
          <Box
            component="footer"
            sx={{
              px: 2,
              pt: 1.25,
              pb: 1.5,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Button
              fullWidth
              variant="contained"
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DownloadRounded />
                )
              }
              disabled={busy || !chosen.length || !isExtension}
              onClick={() => {
                void app.send(chosen.map((r) => r.id));
              }}
            >
              Send {chosen.length || "selected"} to Motrix
            </Button>
            <Typography
              color="text.secondary"
              sx={{ fontSize: 10, mt: 1, textAlign: "center" }}
            >
              Your files. Your device. Your little universe.
            </Typography>
          </Box>
        )}
        <Dialog
          open={Boolean(detail)}
          onClose={() => setDetail(undefined)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Resource details</DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                {detail?.name}
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                {detail?.mime || "Unknown content type"} ·{" "}
                {formatSize(detail?.size)}
              </Typography>
              <TextField
                label="Resource URL"
                value={detail?.url || ""}
                multiline
                minRows={3}
                slotProps={{ input: { readOnly: true } }}
              />
              {detail?.kind === "stream" && (
                <Alert severity="info">
                  This is a streaming manifest. Assembling playable audio and
                  video is not supported by this extension.
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetail(undefined)}>Close</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
          <DialogTitle>Clear discovered resources?</DialogTitle>
          <DialogContent>
            Only this tab's list will be cleared. Downloads already sent to
            Motrix are kept.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmClear(false)}>Keep list</Button>
            <Button
              disabled={busy}
              onClick={() => {
                setConfirmClear(false);
                setSelected([]);
                void app.clear();
              }}
            >
              Clear list
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={Boolean(app.error || app.message)}
          autoHideDuration={app.error ? null : 5000}
          onClose={app.dismissMessage}
        >
          <Alert
            severity={app.error ? "error" : "success"}
            onClose={app.error ? app.dismissError : app.dismissMessage}
            sx={{ width: "100%" }}
          >
            {app.error || app.message}
          </Alert>
        </Snackbar>
      </Box>
    </FestivalProvider>
  );
}
