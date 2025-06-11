import {
  AddOutlined,
  ArrowDownwardOutlined,
  HubOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  ButtonProps,
  Fab,
  IconButton,
  List,
  ListItem,
  styled,
  Typography,
  typographyClasses,
  Zoom,
} from "@mui/material";
import { CSSProperties, MouseEventHandler, ReactNode } from "react";

import { BaseEmpty } from "@/components/BaseEmpty";

export function TaskDownloadDes(props: {
  speed: string;
  connections: string;
  remaining: string;
}) {
  const iconStyle: CSSProperties = { fontSize: "14px" };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        fontSize: "12px",
        alignItems: "center",
        color: "#9B9B9B",
      }}
    >
      <TaskDesIconWithText
        icon={<ArrowDownwardOutlined style={iconStyle} />}
        text={props.speed}
      />
      <span>{props.remaining}</span>
      <TaskDesIconWithText
        icon={<HubOutlined style={iconStyle} />}
        text={props.connections}
      />
    </Box>
  );
}

export function TaskDesIconWithText(props: { icon: ReactNode; text: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
      {props.icon}
      <span>{props.text}</span>
    </Box>
  );
}

export function TaskActionButton(props: {
  title?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <IconButton
      onMouseDown={(e) => e.stopPropagation()}
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e);
      }}
      title={props.title}
      disabled={props.disabled}
    >
      {props.icon}
    </IconButton>
  );
}

export function TaskBannerAction(props: {
  title?: string;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  color?: ButtonProps["color"];
  text?: string;
}) {
  return (
    <Button
      startIcon={props.icon}
      sx={{ borderRadius: "20px" }}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      variant="contained"
      size="small"
      color={props.color}
    >
      {props.text ?? props.title}
    </Button>
  );
}

export function TaskList<T>(props: {
  dataSource: T[];
  renderItem: (item: T, index: number, arr: T[]) => ReactNode;
  emptyText?: string;
}) {
  const { dataSource, renderItem, emptyText = "task.Empty" } = props;

  if (!dataSource.length) {
    return <BaseEmpty text={emptyText} />;
  }

  return (
    <List
      disablePadding
      sx={{
        "& > :not(:last-child)": {
          marginBlockEnd: "16px",
        },
      }}
    >
      {dataSource.map(renderItem)}
    </List>
  );
}

export function TaskFab(props: {
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <Zoom in timeout={300}>
      <Fab
        sx={{ position: "absolute", bottom: 16, right: 16 }}
        color="primary"
        onClick={props.onClick}
      >
        <AddOutlined />
      </Fab>
    </Zoom>
  );
}

export function TaskDrawerList(props: { title?: string; children: ReactNode }) {
  const { title } = props;
  return (
    <List
      subheader={
        !title ? undefined : (
          <Typography variant="subtitle1">{title}</Typography>
        )
      }
    >
      {props.children}
    </List>
  );
}

export const TaskDrawerLabel = styled(Typography)(() => ({
  fontWeight: "bold",
  color: "#555",
}));

export const TaskDrawerValue = styled(Typography)(() => ({
  marginLeft: "8px",
  color: "#777",
}));

export function TaskDrawerItem(props: {
  label: string;
  value: ReactNode;
  action?: ReactNode;
}) {
  return (
    <ListItem
      secondaryAction={props.action}
      sx={{
        gap: "12px",
        [`.${typographyClasses.body1}`]: {
          flex: "1 1 25%",
          textAlign: "end",
        },
        [`.${typographyClasses.body2}`]: {
          flex: "1 1 75%",
        },
      }}
    >
      <TaskDrawerLabel variant="body1">{props.label}:</TaskDrawerLabel>
      <TaskDrawerValue variant="body2">{props.value}</TaskDrawerValue>
    </ListItem>
  );
}
