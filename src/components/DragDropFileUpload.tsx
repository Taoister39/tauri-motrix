import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import {
  ChangeEventHandler,
  DragEventHandler,
  useCallback,
  useState,
} from "react";

interface DragDropFileUploadProps {
  onFileUpload: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
}

function DragDropFileUpload({
  onFileUpload,
  accept,
  multiple,
}: DragDropFileUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver: DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(true);
    },
    [],
  );

  const handleDragLeave: DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(false);
    },
    [],
  );

  const handleDrop: DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files) {
        onFileUpload(event.dataTransfer.files);
      }
    },
    [onFileUpload],
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.target.files) {
        onFileUpload(event.target.files);
      }
    },
    [onFileUpload],
  );

  return (
    <Paper
      variant="outlined"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: dragOver ? "2px dashed #000" : "2px dashed #aaa",
        padding: 20,
        textAlign: "center",
        cursor: "pointer",
        background: dragOver ? "#eee" : "#fafafa",
      }}
    >
      <input
        accept={accept}
        style={{ display: "none" }}
        id="raised-button-file"
        multiple={multiple}
        type="file"
        onChange={handleChange}
      />
      <label htmlFor="raised-button-file">
        <Box display="flex" flexDirection="column" alignItems="center">
          <IconButton
            color="primary"
            aria-label="upload picture"
            component="span"
          >
            <CloudUploadIcon style={{ fontSize: 60 }} />
          </IconButton>
          <Typography>
            Drag and drop files here or click to select files
          </Typography>
        </Box>
      </label>
    </Paper>
  );
}

export default DragDropFileUpload;
