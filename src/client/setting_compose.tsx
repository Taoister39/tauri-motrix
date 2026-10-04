import { ChevronRightRounded } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemButtonProps,
  ListItemText,
  ListSubheader,
} from "@mui/material";
import { ReactNode, useTransition } from "react";

import isAsyncFunction from "@/utils/is_async_function";

export function SettingItem(props: {
  label: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  secondary?: ReactNode;
  onClick?: ListItemButtonProps["onClick"];
}) {
  const { label, extra, children, secondary, onClick } = props;
  const clickable = !!onClick;

  const primary = (
    <Box sx={{ display: "flex", alignItems: "center", fontSize: "14px" }}>
      <span style={{ textWrap: "nowrap" }}>{label}</span>
      {extra}
    </Box>
  );

  const [isPending, startTransition] = useTransition();
  const handleClick: ListItemButtonProps["onClick"] = (e) => {
    if (onClick) {
      if (isAsyncFunction(onClick)) {
        startTransition(() => onClick(e));
      } else {
        onClick(e);
      }
    }
  };

  if (clickable) {
    return (
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick} disabled={isPending}>
          <ListItemText primary={primary} secondary={secondary} />
          {isPending ? (
            <CircularProgress color="inherit" size={20} />
          ) : (
            <ChevronRightRounded />
          )}
        </ListItemButton>
      </ListItem>
    );
  }

  return (
    <ListItem sx={{ pt: "5px", pb: "5px", display: "inline-flex", gap: 2 }}>
      <ListItemText primary={primary} secondary={secondary} />
      {children}
    </ListItem>
  );
}

export function SettingList(props: { title: string; children: ReactNode }) {
  return (
    <List>
      <ListSubheader
        sx={[
          { background: "transparent", fontSize: "16px", fontWeight: "700" },
          ({ palette }) => {
            return {
              color: palette.text.primary,
            };
          },
        ]}
        disableSticky
      >
        {props.title}
      </ListSubheader>

      {props.children}
    </List>
  );
}
