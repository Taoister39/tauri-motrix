import {
  Autocomplete,
  Box,
  FormControlLabel,
  styled,
  Switch,
  TextField,
  useTheme,
} from "@mui/material";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import MonacoEditor from "react-monaco-editor";

import BaseDialog, { DialogRef } from "@/components/BaseDialog";

const TheQuick = styled(Box)`
  position: absolute;
  left: 14px;
  bottom: 8px;
`;

function BtTrackerDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const {
    palette: { mode: themeMode },
  } = useTheme();

  const [open, { setFalse, setTrue }] = useBoolean();

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: setFalse,
  }));

  return (
    <BaseDialog
      open={open}
      title={t("setting.BtTracker")}
      onCancel={setFalse}
      onClose={setFalse}
      fullWidth
      maxWidth="xl"
      contentSx={() => ({
        width: "auto",
        height: "calc(100vh - 185px)",
        overflow: "hidden",
        display: "flex",
        gap: "16px",
        flexDirection: "column",
        pt: "6px !important",
      })}
    >
      <Grouped />
      <MonacoEditor
        language="txt"
        theme={themeMode === "light" ? "vs" : "vs-dark"}
      />
      <TheQuick>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label={"Update tracker list every day automatically"}
        />
      </TheQuick>
    </BaseDialog>
  );
}

function Grouped() {
  const options = top100Films.map((option) => {
    const firstLetter = option.title[0].toUpperCase();
    return {
      firstLetter: /[0-9]/.test(firstLetter) ? "0-9" : firstLetter,
      ...option,
    };
  });

  return (
    <Autocomplete
      size="small"
      multiple
      options={options.sort(
        (a, b) => -b.firstLetter.localeCompare(a.firstLetter),
      )}
      groupBy={(option) => option.firstLetter}
      getOptionLabel={(option) => option.title}
      fullWidth
      renderInput={(params) => (
        <TextField {...params} label="With categories" variant="standard" />
      )}
    />
  );
}

// Top 100 films as rated by IMDb users. http://www.imdb.com/chart/top
const top100Films = [
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 },
  { title: "The Godfather: Part II", year: 1974 },
  { title: "The Dark Knight", year: 2008 },
  { title: "12 Angry Men", year: 1957 },
  { title: "Schindler's List", year: 1993 },
  { title: "Pulp Fiction", year: 1994 },
  {
    title: "The Lord of the Rings: The Return of the King",
    year: 2003,
  },
  { title: "The Good, the Bad and the Ugly", year: 1966 },
  { title: "Fight Club", year: 1999 },
  {
    title: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001,
  },
  {
    title: "Star Wars: Episode V - The Empire Strikes Back",
    year: 1980,
  },
  { title: "Forrest Gump", year: 1994 },
  { title: "Inception", year: 2010 },
  {
    title: "The Lord of the Rings: The Two Towers",
    year: 2002,
  },
  { title: "One Flew Over the Cuckoo's Nest", year: 1975 },
  { title: "Goodfellas", year: 1990 },
];
export default BtTrackerDialog;
