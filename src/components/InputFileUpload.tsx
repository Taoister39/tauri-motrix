import { DeleteOutline } from "@mui/icons-material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, IconButton, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { styled, SxProps, Theme } from "@mui/material/styles";
import { Ref, useActionState } from "react";
import { useTranslation } from "react-i18next";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

export interface InputFileUploadProps {
  text?: string;
  multiple?: boolean;
  sx?: SxProps<Theme>;
  accept?: string;
  ref?: Ref<HTMLInputElement>;
  onChange?: (files: File[]) => void;
  hideList?: boolean;
}

export default function InputFileUpload({
  text,
  multiple,
  sx,
  accept,
  ref,
  onChange,
  hideList,
}: InputFileUploadProps) {
  const { t } = useTranslation();

  // TODO: async function outside of useActionState
  const [files, onFileInput, isPending] = useActionState<
    File[],
    FileList | null | File[]
  >((nameList, files) => {
    if (!files) {
      return nameList;
    }

    const filesArray = Array.from(files);
    onChange?.(filesArray);

    return filesArray;
  }, []);

  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Button
        component="label"
        role={undefined}
        variant="contained"
        tabIndex={-1}
        startIcon={<CloudUploadIcon />}
        sx={sx}
        loading={isPending}
        loadingIndicator="Loading…"
      >
        {t(text ?? "common.UploadFile")}
        <VisuallyHiddenInput
          type="file"
          onChange={(e) => onFileInput(e.target.files)}
          multiple={multiple}
          accept={accept}
          ref={ref}
          onClick={(e) => {
            // exist chose same file
            e.currentTarget.value = "";
          }}
        />
      </Button>

      {!hideList &&
        files.map((item, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography noWrap sx={{ mt: 1 }}>
              {item.name}
            </Typography>
            <IconButton
              onClick={() => onFileInput(files.filter((x) => x !== item))}
            >
              <DeleteOutline />
            </IconButton>
          </Box>
        ))}
    </Box>
  );
}
