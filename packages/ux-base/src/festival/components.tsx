import {
  Box,
  Checkbox,
  Chip,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { type ReactNode, useId } from "react";

import { festivalTokens } from "../tokens";
export function FestivalBrand({ suffix }: { suffix?: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
      <Box
        component="svg"
        viewBox="0 0 32 32"
        width={29}
        height={29}
        aria-hidden="true"
        sx={{ color: "primary.main", flexShrink: 0 }}
      >
        <path
          fill="currentColor"
          d="M16 0 21 11 32 16 21 21 16 32 11 21 0 16 11 11Z"
        />
        <path fill="#fffef9" d="M14 8h4v9h4l-6 7-6-7h4Z" />
      </Box>
      <Typography
        component="span"
        sx={{ fontWeight: 900, fontSize: 25, letterSpacing: -1 }}
      >
        motrix
        <Box component="span" sx={{ color: "secondary.main" }}>
          ✦
        </Box>
      </Typography>
      {suffix && (
        <Typography
          variant="overline"
          sx={{
            ml: 0.5,
            fontSize: 9,
            letterSpacing: 1.5,
            color: "text.secondary",
          }}
        >
          {suffix}
        </Typography>
      )}
    </Stack>
  );
}
export interface FestivalHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  artwork?: {
    src: string;
    alt: string;
  };
}
export function FestivalHero({
  eyebrow,
  title,
  description,
  artwork,
}: FestivalHeroProps) {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: 110,
        overflow: "hidden",
        borderRadius: 2,
        bgcolor: "#182552",
        color: "#fffef9",
        p: 1.75,
        isolation: "isolate",
        backgroundImage:
          "radial-gradient(circle at 60% 30%, #4b5fc0, transparent 75%)",
      }}
    >
      <Box
        sx={{
          width: artwork ? "62%" : "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 9,
            letterSpacing: 1.5,
            fontWeight: 700,
            color: "#64f2df",
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          component="h1"
          sx={{
            my: 0.8,
            fontFamily: festivalTokens.posterFontFamily,
            fontStyle: "italic",
            fontWeight: 900,
            fontSize: "clamp(28px, 7vw, 34px)",
            lineHeight: 0.95,
            textTransform: "uppercase",
            textShadow: "2px 2px 0 #182552",
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            maxWidth: 185,
            lineHeight: 1.5,
            color: "#dce5ff",
          }}
        >
          {description}
        </Typography>
      </Box>
      {artwork && (
        <Box
          component="img"
          src={artwork.src}
          alt={artwork.alt}
          width={190}
          height={190}
          sx={{
            position: "absolute",
            right: -12,
            bottom: -15,
            width: "47%",
            height: "115%",
            objectFit: "cover",
            objectPosition: "85% 25%",
            maskImage: "linear-gradient(to right, transparent, black 20%)",
          }}
        />
      )}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          right: 13,
          bottom: 7,
          color: "#f7ff80",
          fontSize: 27,
        }}
      >
        ✦
      </Box>
    </Box>
  );
}
export interface FestivalToggleCardProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
}
export function FestivalToggleCard({
  title,
  description,
  checked,
  disabled,
  onChange,
  icon,
}: FestivalToggleCardProps) {
  const id = useId();
  const colors = festivalTokens[useTheme().palette.mode];
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        bgcolor: checked ? colors.mint : "background.paper",
        borderColor: checked ? colors.onMint : "divider",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
        {icon && (
          <Box
            sx={{
              display: "flex",
              color: checked ? colors.onMint : "text.secondary",
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography id={id} sx={{ fontWeight: 700, fontSize: 13 }}>
            {title}
          </Typography>
          <Typography
            id={`${id}-help`}
            color="text.secondary"
            sx={{ fontSize: 11, lineHeight: 1.5 }}
          >
            {description}
          </Typography>
        </Box>
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(_, value) => onChange(value)}
          slotProps={{
            input: { "aria-labelledby": id, "aria-describedby": `${id}-help` },
          }}
        />
      </Stack>
    </Paper>
  );
}
export interface FestivalResourceRowProps {
  title: string;
  subtitle: string;
  badge: string;
  thumbnail?: string;
  icon: ReactNode;
  checked: boolean;
  disabled?: boolean;
  status?: string;
  onSelect: (checked: boolean) => void;
  action?: ReactNode;
}
export function FestivalResourceRow({
  title,
  subtitle,
  badge,
  thumbnail,
  icon,
  checked,
  disabled,
  status,
  onSelect,
  action,
}: FestivalResourceRowProps) {
  const id = useId();
  const colors = festivalTokens[useTheme().palette.mode];
  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{
        listStyle: "none",
        p: 1,
        bgcolor: checked ? colors.tint : "background.paper",
        borderColor: checked ? "primary.main" : "divider",
      }}
    >
      <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(_, value) => onSelect(value)}
          size="small"
          slotProps={{ input: { "aria-labelledby": id } }}
          sx={{ p: 0.5 }}
        />
        <Box
          sx={{
            width: 40,
            height: 44,
            flexShrink: 0,
            borderRadius: 1,
            bgcolor: colors.mint,
            color: colors.onMint,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          {thumbnail ? (
            <Box
              component="img"
              src={thumbnail}
              alt=""
              width={40}
              height={44}
              sx={{ objectFit: "cover" }}
            />
          ) : (
            icon
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            id={id}
            title={title}
            noWrap
            sx={{ fontSize: 12, fontWeight: 700 }}
          >
            {title}
          </Typography>
          <Typography
            noWrap
            color="text.secondary"
            title={subtitle}
            sx={{ fontSize: 10 }}
          >
            {subtitle}
          </Typography>
          {status && (
            <Typography color="primary.main" sx={{ fontSize: 10 }}>
              {status}
            </Typography>
          )}
        </Box>
        <Chip
          label={badge}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: 9 }}
        />
        {action}
      </Stack>
    </Paper>
  );
}
export function FestivalEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Box sx={{ py: 3, px: 2, textAlign: "center" }} role="status">
      <Box sx={{ color: "primary.main", mb: 1 }}>{icon}</Box>
      <Typography component="h3" variant="h3">
        {title}
      </Typography>
      <Typography
        color="text.secondary"
        sx={{ mt: 1, mb: 2, fontSize: 12, maxWidth: 290, mx: "auto" }}
      >
        {description}
      </Typography>
      {action}
    </Box>
  );
}
