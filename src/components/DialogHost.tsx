import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { useEffect, useId, useState } from "react";
import { useStore } from "zustand";

import { BaseDialog } from "@/components/BaseDialog";
import {
  completeDialog,
  dialogStore,
  registerDialogHost,
} from "@/services/dialog";

function DialogRequestView() {
  const request = useStore(dialogStore, (state) => state.requests[0]);
  const [checked, setChecked] = useState(false);
  const descriptionId = useId();
  if (!request) return null;
  const { id, options } = request;
  const cancel = () => completeDialog(id, { action: null, checked: false });

  return (
    <BaseDialog
      open
      fullWidth
      maxWidth="sm"
      title={options.title}
      descriptionId={descriptionId}
      onClose={cancel}
      actions={
        <>
          <Button autoFocus variant="outlined" onClick={cancel}>
            {options.cancelLabel}
          </Button>
          {options.actions.map((action) => (
            <Button
              key={action.id}
              variant="contained"
              color={action.danger ? "error" : "primary"}
              onClick={() => completeDialog(id, { action: action.id, checked })}
            >
              {checked ? (action.checkedLabel ?? action.label) : action.label}
            </Button>
          ))}
        </>
      }
    >
      <Typography id={descriptionId} sx={{ whiteSpace: "pre-line" }}>
        {options.message}
      </Typography>
      {!!options.details?.length && (
        <Box component="ul" sx={{ maxHeight: 240, overflow: "auto", pl: 3 }}>
          {options.details.map((detail, index) => (
            <Typography
              component="li"
              key={`${index}:${detail}`}
              variant="body2"
              sx={{ overflowWrap: "anywhere", whiteSpace: "pre-line" }}
            >
              {detail}
            </Typography>
          ))}
        </Box>
      )}
      {options.checkboxLabel && (
        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox
              checked={checked}
              onChange={(_, value) => setChecked(value)}
            />
          }
          label={options.checkboxLabel}
        />
      )}
    </BaseDialog>
  );
}

export function DialogHost() {
  const id = useStore(dialogStore, (state) => state.requests[0]?.id);
  useEffect(registerDialogHost, []);
  return <DialogRequestView key={id} />;
}
