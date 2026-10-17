import AudioFileRounded from "@mui/icons-material/AudioFileRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import RadarRounded from "@mui/icons-material/RadarRounded";
import VideoFileRounded from "@mui/icons-material/VideoFileRounded";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  FestivalEmptyState,
  FestivalResourceRow,
} from "@tauri-motrix/ux-base/festival";
import { type Dispatch, type SetStateAction, useState } from "react";

import { isExtension } from "./client";
import {
  formatSize,
  type Resource,
  type ResourceKind,
  selectionLimit,
  selectResources,
  type Snapshot,
} from "./model";
const categories = [
  "all",
  "video",
  "audio",
  "image",
  "file",
  "stream",
] as const;
const icons: Record<ResourceKind, typeof VideoFileRounded> = {
  video: VideoFileRounded,
  audio: AudioFileRounded,
  image: ImageRounded,
  file: DownloadRounded,
  stream: RadarRounded,
};

interface ResourcePanelProps {
  snapshot: Snapshot;
  busy: boolean;
  loading: boolean;
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
  onDetail: (r: Resource) => void;
  onClear: () => void;
  onToggleSniffing: () => void;
}
export function ResourcePanel({
  snapshot,
  busy,
  loading,
  selected,
  setSelected,
  onDetail,
  onClear,
  onToggleSniffing,
}: ResourcePanelProps) {
  const [filter, setFilter] = useState<(typeof categories)[number]>("all");
  const [query, setQuery] = useState("");
  const resources = snapshot.resources.filter(
    (r) =>
      (filter === "all" || r.kind === filter) &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selectable = resources.filter((r) => r.kind !== "stream" && !r.sent);
  const chosen = snapshot.resources.filter(
    (r) => selected.includes(r.id) && !r.sent && r.kind !== "stream",
  );
  const allSelected =
    selectable.length > 0 && selectable.every((r) => selected.includes(r.id));
  const partialSelected =
    !allSelected && selectable.some((r) => selected.includes(r.id));

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h2">
            Resource radar{" "}
            <Box component="span" sx={{ color: "secondary.main" }}>
              ✦
            </Box>
          </Typography>
          <Typography
            color="text.secondary"
            noWrap
            title={snapshot.tabTitle}
            sx={{ fontSize: 10, maxWidth: 200 }}
          >
            {snapshot.tabTitle}
          </Typography>
        </Box>
        <Button
          variant={snapshot.preferences.sniffing ? "outlined" : "contained"}
          size="small"
          startIcon={<RadarRounded />}
          disabled={busy || !isExtension}
          onClick={() => {
            onToggleSniffing();
          }}
        >
          {snapshot.preferences.sniffing ? "Pause" : "Listen"}
        </Button>
      </Stack>
      <Box
        role="group"
        aria-label="Resource type"
        sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}
      >
        {categories.map((kind) => (
          <Chip
            key={kind}
            label={`${kind === "all" ? "All" : kind[0].toUpperCase() + kind.slice(1)} ${snapshot.resources.filter((r) => kind === "all" || r.kind === kind).length}`}
            clickable
            onClick={() => setFilter(kind)}
            color={filter === kind ? "primary" : "default"}
            variant={filter === kind ? "filled" : "outlined"}
            size="small"
            aria-pressed={filter === kind}
            sx={{ fontSize: 10 }}
          />
        ))}
      </Box>
      {snapshot.resources.length > 0 && (
        <TextField
          label="Find a resource"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
      )}
      {loading ? (
        <Box role="status" sx={{ textAlign: "center", p: 3 }}>
          <CircularProgress size={24} aria-label="Loading resources" />
        </Box>
      ) : resources.length ? (
        <>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={partialSelected}
                disabled={busy || !selectable.length}
                slotProps={{
                  input: {
                    "aria-label": "Select visible downloadable resources",
                  },
                }}
                onChange={(_, checked) =>
                  setSelected((ids) =>
                    checked
                      ? selectResources(snapshot.resources, [
                          ...ids,
                          ...selectable.map((r) => r.id),
                        ])
                      : ids.filter(
                          (id) => !selectable.some((r) => r.id === id),
                        ),
                  )
                }
              />
              <Typography sx={{ fontSize: 11 }}>
                {chosen.length} / {selectionLimit} selected
              </Typography>
            </Stack>
            <Button size="small" disabled={busy} onClick={() => onClear()}>
              Clear list
            </Button>
          </Stack>
          <Stack component="ul" spacing={1} sx={{ p: 0, m: 0 }}>
            {resources.map((r) => {
              const Icon = icons[r.kind];
              return (
                <FestivalResourceRow
                  key={r.id}
                  title={r.name}
                  subtitle={`${formatSize(r.size)} · ${new URL(r.url).hostname}`}
                  badge={
                    r.kind === "stream" ? "HLS/DASH" : r.kind.toUpperCase()
                  }
                  icon={<Icon fontSize="small" />}
                  checked={chosen.some((s) => s.id === r.id)}
                  disabled={
                    busy ||
                    r.sent ||
                    r.kind === "stream" ||
                    (chosen.length >= selectionLimit &&
                      !selected.includes(r.id))
                  }
                  status={
                    r.sent
                      ? "Sent to Motrix"
                      : r.kind === "stream"
                        ? "Stream download not supported"
                        : undefined
                  }
                  onSelect={(checked) =>
                    setSelected((ids) =>
                      checked
                        ? selectResources(snapshot.resources, [...ids, r.id])
                        : ids.filter((id) => id !== r.id),
                    )
                  }
                  action={
                    <IconButton
                      size="small"
                      aria-label={`Details for ${r.name}`}
                      onClick={() => onDetail(r)}
                    >
                      <InfoOutlined sx={{ fontSize: 17 }} />
                    </IconButton>
                  }
                />
              );
            })}
          </Stack>
        </>
      ) : (
        <FestivalEmptyState
          icon={<RadarRounded sx={{ fontSize: 40 }} />}
          title={
            query || filter !== "all"
              ? "Nothing in this orbit"
              : snapshot.preferences.sniffing
                ? "Listening to this tab"
                : "Ready when you are"
          }
          description={
            query || filter !== "all"
              ? "Try another filter or a shorter search."
              : snapshot.preferences.sniffing
                ? "Reload the page or play media to discover new requests. Protected and embedded resources may not appear."
                : "Start listening, then browse or play a video. Your discoveries will appear here."
          }
        />
      )}
    </Stack>
  );
}
