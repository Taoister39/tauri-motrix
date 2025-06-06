import { DeleteOutline } from "@mui/icons-material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, IconButton, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { styled, SxProps, Theme } from "@mui/material/styles";
import { useMergedState } from "rc-util";
import { Ref, useTransition } from "react";
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

// TODO: wrap the File type
export interface InputFileUploadProps {
  text?: string;
  multiple?: boolean;
  sx?: SxProps<Theme>;
  accept?: string;
  ref?: Ref<HTMLInputElement>;
  onChange?: (files: File[]) => void;
  hideList?: boolean;
  fileList?: File[];
  defaultFileList?: File[];
}

export default function InputFileUpload({
  text,
  multiple,
  sx,
  accept,
  ref,
  onChange,
  hideList,
  fileList,
  defaultFileList,
}: InputFileUploadProps) {
  const { t } = useTranslation();

  const [mergedFileList, setMergedFileList] = useMergedState(
    defaultFileList || [],
    {
      value: fileList,
      postState: (list) => list ?? [],
    },
  );

  const [isPending, startTransition] = useTransition();

  const onFileInput = (files: FileList | File[] | null) => {
    startTransition(async () => {
      if (!files) {
        return;
      }

      const filesArray = Array.from(files);
      await onChange?.(filesArray);
      setMergedFileList(filesArray);
    });
  };

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
        mergedFileList.map((item, index) => (
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
              onClick={() =>
                onFileInput(mergedFileList.filter((x) => x !== item))
              }
            >
              <DeleteOutline />
            </IconButton>
          </Box>
        ))}
    </Box>
  );
}
