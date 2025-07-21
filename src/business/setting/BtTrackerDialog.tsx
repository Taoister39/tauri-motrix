import {
  Autocomplete,
  Box,
  inputBaseClasses,
  styled,
  TextField,
  textFieldClasses,
} from "@mui/material";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";

import BaseDialog, { DialogRef } from "@/components/BaseDialog";

const TheQuick = styled(Box)`
  position: absolute;
  left: 14px;
  bottom: 8px;
`;

function BtTrackerDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();

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
        // fix TextField height not
        [`.${textFieldClasses.root}`]: {
          height: "100%",
          [`.${inputBaseClasses.root}`]: {
            height: "100%",
            alignItems: "flex-start",
          },
          [`.${inputBaseClasses.input}`]: {
            height: "100% !important",
            boxSizing: "border-box",
          },
        },
      })}
    >
      <Grouped />
      <TextField fullWidth multiline />
      <TheQuick></TheQuick>
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
        <TextField {...params} label="With categories" />
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
