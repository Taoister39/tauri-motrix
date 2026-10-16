import {
  AudioFileOutlined,
  DescriptionOutlined,
  FolderOutlined,
  ImageOutlined,
  InsertDriveFileOutlined,
  VideoFileOutlined,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import {
  getHistoryThumbnail,
  type HistoryFileInspection,
} from "@/services/history_files";

function placeholder(path: string, kind: HistoryFileInspection["kind"]) {
  if (kind === "directory") return <FolderOutlined />;
  const extension = path.split(/[\\/]/).pop()?.split(".").pop()?.toLowerCase();
  if (/^(png|jpe?g|gif|webp|bmp|svg|avif|heic|tiff?)$/.test(extension ?? ""))
    return <ImageOutlined />;
  if (/^(mp4|mkv|mov|avi|webm|m4v)$/.test(extension ?? ""))
    return <VideoFileOutlined />;
  if (/^(mp3|flac|wav|ogg|m4a|aac)$/.test(extension ?? ""))
    return <AudioFileOutlined />;
  if (/^(pdf|txt|md|docx?|xlsx?|pptx?|csv)$/.test(extension ?? ""))
    return <DescriptionOutlined />;
  return <InsertDriveFileOutlined />;
}

export function HistoryThumbnail({
  path,
  file,
}: {
  path: string;
  file?: HistoryFileInspection;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [preview, setPreview] = useState<{
    key: string;
    image: string | null;
  }>();
  const revision = file?.revision;
  const eligible = file?.state === "present" && file.kind !== null;
  const key = JSON.stringify([path, revision]);

  useEffect(() => {
    if (!element.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearby(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNearby(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearby || !eligible || !revision) {
      setPreview(undefined);
      return;
    }
    let disposed = false;
    getHistoryThumbnail(path, revision)
      .then((image) => {
        if (!disposed) setPreview({ key, image });
      })
      .catch(() => {
        if (!disposed) setPreview({ key, image: null });
      });
    return () => {
      disposed = true;
    };
  }, [nearby, eligible, path, revision, key]);

  const image =
    nearby && eligible && preview?.key === key ? preview.image : null;

  return (
    <Box
      ref={element}
      aria-hidden="true"
      sx={{
        width: 48,
        height: 48,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        borderRadius: 1,
        overflow: "hidden",
        "& .MuiSvgIcon-root": { fontSize: 32 },
      }}
    >
      {image ? (
        <Box
          component="img"
          src={image}
          alt=""
          onError={() => setPreview({ key, image: null })}
          sx={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        placeholder(path, file?.kind ?? null)
      )}
    </Box>
  );
}
