import { Article, MusicNote, Photo, Theaters } from "@mui/icons-material";
import {
  Box,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  ToggleButtonProps,
  Tooltip,
} from "@mui/material";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer, {
  TableContainerProps,
} from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { Instance } from "parse-torrent";
import { useMergedState } from "rc-util";
import { Key, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import useLazyKVMap, { GetRowKey } from "@/hooks/lazy_kv_map";
import { calcProgress, parseByteVo } from "@/utils/download";
import {
  filterAudioFiles,
  filterDocumentFiles,
  filterImageFiles,
  filterVideoFiles,
} from "@/utils/file";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

// Enhanced TableContainer with error styling
const ErrorTableContainer = styled(TableContainer, {
  shouldForwardProp: (prop) => prop !== "hasError",
})<{ hasError?: boolean } & TableContainerProps>(({ theme, hasError }) => ({
  border: hasError ? `2px solid ${theme.palette.error.main}` : "none",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: hasError ? "rgba(244, 67, 54, 0.04)" : "inherit",
  transition: "border 0.2s ease-in-out, background-color 0.2s ease-in-out",

  // Add a subtle glow effect for errors
  ...(hasError && {
    boxShadow: `0 0 0 1px ${theme.palette.error.main}20`,
  }),
}));

// Error indicator component
const ErrorIndicator = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: -8,
  right: -8,
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  borderRadius: "50%",
  width: 16,
  height: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "bold",
  zIndex: 1,
}));

export type TaskFile = Omit<
  NonNullable<Instance["files"]>[number],
  "offset"
> & {
  idx: number;
  extension: string;
  completedLength?: number;
};

export interface TaskFilesProps {
  mode?: "DETAIL";
  files?: TaskFile[];
  rowKey?: string;
  selectedRowKeys?: Key[];
  defaultSelectedRowKeys?: Key[];
  onSelectionChange?: (
    keys: Key[],
    record: unknown,
    info: { type: RowSelectMethod },
  ) => void;
  error?: boolean;
  helperText?: string;
  height?: number;
}

import { FILE_SELECTION, RowSelectMethod } from "@/constant/taskFiles";

export default function TaskFiles({
  files,
  rowKey = "path",
  defaultSelectedRowKeys,
  selectedRowKeys,
  onSelectionChange,
  mode,
  error,
  helperText,
  height,
}: TaskFilesProps) {
  const { t } = useTranslation();

  const [toggleFileType, setToggleFileType] = useState<
    FILE_SELECTION | undefined
  >();

  const [mergedSelectedKeys, setMergedSelectedKeys] = useMergedState(
    selectedRowKeys || defaultSelectedRowKeys || [],
    {
      value: selectedRowKeys,
    },
  );

  const rawData: readonly TaskFile[] = useMemo(() => files || [], [files]);

  const getRowKey = useMemo<GetRowKey<TaskFile>>(() => {
    if (typeof rowKey === "function") {
      return rowKey;
    }

    return (record: TaskFile, index) =>
      record[rowKey as keyof TaskFile] || `default_${index}`;
  }, [rowKey]);

  const derivedSelectedKeySet = useMemo<Set<Key>>(
    () => new Set(mergedSelectedKeys),
    [mergedSelectedKeys],
  );

  const fileSelections = useMemo(
    () =>
      [
        {
          icon: <Theaters />,
          value: FILE_SELECTION.Video,
        },
        {
          icon: <MusicNote />,
          value: FILE_SELECTION.Audio,
        },
        {
          icon: <Photo />,
          value: FILE_SELECTION.Image,
        },
        {
          icon: <Article />,
          value: FILE_SELECTION.Document,
        },
      ] as const,
    [],
  );

  const [getRecordByKey] = useLazyKVMap<TaskFile>(
    rawData,
    "children",
    getRowKey,
  );

  const selectedFilesTotalSize = useMemo(() => {
    // TODO: first time app didn't get length field
    const result = mergedSelectedKeys.map(getRecordByKey).reduce((acc, cur) => {
      return acc + Number(cur?.length);
    }, 0);
    return parseByteVo(result).join("");
  }, [getRecordByKey, mergedSelectedKeys]);

  const setSelectedKeys = useCallback(
    (keys: Key[], method: RowSelectMethod) => {
      const availableKeys: Key[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: any[] = [];

      // Filter key which not exist in the `dataSource`
      keys.forEach((key) => {
        const record = getRecordByKey(key);
        if (record !== undefined) {
          availableKeys.push(key);
          records.push(record);
        }
      });

      setMergedSelectedKeys(availableKeys);
      onSelectionChange?.(availableKeys, records, { type: method });
    },
    [getRecordByKey, onSelectionChange, setMergedSelectedKeys],
  );

  const onSelectAllChange = useCallback(() => {
    const keySet = new Set(derivedSelectedKeySet);

    // Record key only need check with enabled
    const recordKeys = rawData.map(getRowKey);
    const checkedCurrentAll = recordKeys.every((key) => keySet.has(key));
    const changeKeys: Key[] = [];

    if (checkedCurrentAll) {
      recordKeys.forEach((key) => {
        keySet.delete(key);
        changeKeys.push(key);
      });
    } else {
      recordKeys.forEach((key) => {
        if (!keySet.has(key)) {
          keySet.add(key);
          changeKeys.push(key);
        }
      });
    }

    const keys = Array.from(keySet);

    setSelectedKeys(keys, "all");
    setToggleFileType(undefined);
  }, [derivedSelectedKeySet, rawData, getRowKey, setSelectedKeys]);

  const handleToggleFile = useCallback<
    NonNullable<ToggleButtonProps["onChange"]>
  >(
    (_, value) => {
      setToggleFileType(value);

      if (!value) {
        return;
      }

      let filtered: TaskFile[] = [];

      const variableRawData = Array.from(rawData);

      switch (value) {
        case FILE_SELECTION.Audio:
          filtered = filterAudioFiles(variableRawData);
          break;

        case FILE_SELECTION.Video:
          filtered = filterVideoFiles(variableRawData);
          break;

        case FILE_SELECTION.Image:
          filtered = filterImageFiles(variableRawData);
          break;

        case FILE_SELECTION.Document:
          filtered = filterDocumentFiles(variableRawData);
          break;
      }

      const newKeys = filtered.map(getRowKey);
      setSelectedKeys(newKeys, "multiple");
    },
    [getRowKey, rawData, setSelectedKeys],
  );

  const renderCell = useCallback(
    (key: Key, record: TaskFile, index: number) => {
      const checked = derivedSelectedKeySet.has(key);

      return (
        <StyledTableRow key={index}>
          <StyledTableCell component="th" scope="row">
            <Checkbox
              size="small"
              checked={checked}
              onChange={() => {
                const keySet = new Set(derivedSelectedKeySet);

                if (checked) {
                  keySet.delete(key);
                } else {
                  keySet.add(key);
                }
                const keys = Array.from(keySet);

                setSelectedKeys(keys, "single");
                setToggleFileType(undefined);
              }}
            />
          </StyledTableCell>
          <StyledTableCell>
            <Tooltip title={record.name} placement="top">
              <Box
                sx={{
                  display: "table",
                  tableLayout: "fixed",
                  width: "100%",
                  "> p": {
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <p>{record.name}</p>
              </Box>
            </Tooltip>
          </StyledTableCell>
          <StyledTableCell>{record.extension}</StyledTableCell>
          {mode === "DETAIL" && (
            <>
              <StyledTableCell align="right" width={50}>
                {calcProgress(record.length, record.completedLength || 0, 1)}
              </StyledTableCell>

              <StyledTableCell align="right" width={85}>
                {parseByteVo(record.completedLength).join("")}
              </StyledTableCell>
            </>
          )}
          <StyledTableCell align="right">
            {parseByteVo(record.length).join("")}
          </StyledTableCell>
        </StyledTableRow>
      );
    },
    [derivedSelectedKeySet, mode, setSelectedKeys],
  );

  return (
    <FormControl error={error} sx={{ width: "100%" }}>
      {/* <Alert severity="error" sx={{ mb: 2 }}>
        {helperText}
      </Alert> */}

      <Box sx={{ position: "relative", overflow: "auto" }}>
        {error && <ErrorIndicator>!</ErrorIndicator>}
        <ErrorTableContainer component={Paper} hasError={error} sx={{ height }}>
          <Table aria-label="task files table" size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <StyledTableCell>
                  <Checkbox
                    checked={mergedSelectedKeys.length === rawData.length}
                    sx={(theme) => ({
                      color: theme.palette.common.white,
                      "&.Mui-checked": {
                        color: theme.palette.common.white,
                      },
                    })}
                    onChange={onSelectAllChange}
                  />
                </StyledTableCell>
                <StyledTableCell>Name</StyledTableCell>
                <StyledTableCell>Extension</StyledTableCell>
                {mode === "DETAIL" && (
                  <>
                    <StyledTableCell align="right" width={50}>
                      %
                    </StyledTableCell>

                    <StyledTableCell align="right" width={85}>
                      ✓
                    </StyledTableCell>
                  </>
                )}
                <StyledTableCell align="right">
                  {t("task.FileSize")}
                </StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rawData.map((record, index) =>
                renderCell(getRowKey(record, index), record, index),
              )}
            </TableBody>
          </Table>
        </ErrorTableContainer>
      </Box>
      {/* Enhanced helper text with better styling */}
      <FormHelperText
        sx={{
          mt: 1,
          fontWeight: error ? 500 : 400,
          fontSize: error ? "0.875rem" : "0.75rem",
        }}
      >
        {helperText}
      </FormHelperText>
      <Grid
        container
        spacing={2}
        sx={{
          mt: 2,
          alignItems: "center",
          ...(error && {
            opacity: 0.8,
            "& .MuiToggleButton-root": {
              borderColor: "error.main",
            },
          }),
        }}
        columns={24}
      >
        <Grid
          size={{
            xs: 24,
            sm: 8,
            md: 8,
            lg: 8,
          }}
        >
          <ToggleButtonGroup
            size="small"
            value={toggleFileType}
            onChange={handleToggleFile}
            exclusive
            color="primary"
            sx={{
              // Enhanced styling for error states
              ...(error && {
                "& .MuiToggleButton-root": {
                  borderColor: "rgba(244, 67, 54, 0.5)",
                  "&:hover": {
                    backgroundColor: "rgba(244, 67, 54, 0.04)",
                  },
                },
              }),
            }}
          >
            {fileSelections.map(({ icon, value }) => (
              <ToggleButton value={value} key={value}>
                {icon}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Grid>
        <Grid
          size={{
            xs: 24,
            sm: 16,
            md: 16,
            lg: 16,
          }}
        >
          <FormLabel>
            {t("task.SelectedFilesSum", {
              selectedFilesCount: mergedSelectedKeys.length,
              selectedFilesTotalSize,
            })}
          </FormLabel>
        </Grid>
      </Grid>
    </FormControl>
  );
}
