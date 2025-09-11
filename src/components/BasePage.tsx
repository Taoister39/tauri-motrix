import { styled, Typography } from "@mui/material";
import { ReactNode } from "react";

import BaseErrorBoundary from "@/components/BaseErrorBoundary";

interface Props {
  title?: ReactNode; // the page title
  header?: ReactNode; // something behind title
  children?: ReactNode;
  full?: boolean;
  fab?: ReactNode; // floating action button
}

const ThePage = styled("div")(() => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
}));

const Header = styled("header")(({ theme }) => ({
  userSelect: "none",
  flex: "0 0 58px",
  width: "100%",
  margin: "0 auto",
  padding: "0 20px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--divider-color)",
  backgroundColor: theme.palette.background.paper,
}));

const TheContainer = styled("article")<{ full?: boolean }>(({ full }) => ({
  width: "100%",
  height: "100%",
  overflow: full ? "visible" : "auto",
  backgroundColor: "var(--background-color)",
  padding: full ? 0 : "10px",
  boxSizing: "border-box",
}));

function BasePage({ title, header, children, full, fab }: Props) {
  return (
    <BaseErrorBoundary>
      <ThePage className="base-page">
        <Header data-tauri-drag-region>
          <Typography sx={{ fontSize: "20px", fontWeight: "700" }}>
            {title}
          </Typography>
          {header}
        </Header>
        <TheContainer full={full}>
          {children}
          {fab}
        </TheContainer>
      </ThePage>
    </BaseErrorBoundary>
  );
}

export default BasePage;
