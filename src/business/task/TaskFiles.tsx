import { Checkbox } from "@mui/material";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { Instance } from "parse-torrent";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { parseByteVo } from "@/utils/download";
import { getFileExtension } from "@/utils/file";

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

export interface TaskFilesProps {
  files: Instance["files"];
}

export default function TaskFiles({ files }: TaskFilesProps) {
  const { t } = useTranslation();

  const [selectedRows, setSelectedRows] = useState<NonNullable<typeof files>>(
    [],
  );

  return (
    <TableContainer component={Paper}>
      <Table aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>
              <Checkbox
                checked={selectedRows?.length === files?.length}
                sx={(theme) => ({
                  color: theme.palette.common.white,
                  "&.Mui-checked": {
                    color: theme.palette.common.white,
                  },
                })}
                onChange={(e) => {
                  if (e.target.checked && files) {
                    setSelectedRows(files);
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </StyledTableCell>
            <StyledTableCell>Name</StyledTableCell>
            <StyledTableCell>Extension</StyledTableCell>
            <StyledTableCell align="right">
              {t("task.FileSize")}
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files?.map((row) => (
            <StyledTableRow key={row.name}>
              <StyledTableCell component="th" scope="row">
                <Checkbox
                  size="small"
                  checked={selectedRows?.includes(row)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows([...selectedRows, row]);
                    } else {
                      setSelectedRows(selectedRows.filter((r) => r !== row));
                    }
                  }}
                />
              </StyledTableCell>
              <StyledTableCell sx={{ textOverflow: "ellipsis" }}>
                {row.name}
              </StyledTableCell>
              <StyledTableCell>{getFileExtension(row.path)}</StyledTableCell>
              <StyledTableCell align="right">
                {parseByteVo(row.length).join("")}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
