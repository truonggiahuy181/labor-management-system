"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Switch,
  TextField,
} from "@mui/material";
import { useSnackbar } from "notistack";
import CatalogListTable, { type CatalogColumn } from "./CatalogListTable";
import OccupationFormDialog from "./OccupationFormDialog";
import TableFilterAutocomplete from "@/Components/TableFilterAutocomplete";
import useLocales from "@/Hooks/useLocales";
import { occupationApi, type Occupation } from "@/services/accidentCatalog";
import { getErrorMessage } from "@/services/user";

type Filters = {
  occupationCode: string;
  occupationName: string;
  level: string;
  parentId: string;
  isActive: string;
};

const EMPTY_FILTERS: Filters = {
  occupationCode: "",
  occupationName: "",
  level: "",
  parentId: "",
  isActive: "",
};

const includes = (value: string, keyword: string) =>
  value.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase());

export default function OccupationCatalog() {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState<Occupation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Occupation | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    occupationApi
      .list({ includeInactive: true })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(
            getErrorMessage(
              error,
              translate("accidentCatalog.loadOccupationsFailed"),
            ),
            { variant: "error" },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar, reloadCount, translate]);

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          includes(row.occupationCode, filters.occupationCode) &&
          includes(row.occupationName, filters.occupationName) &&
          (!filters.level || String(row.level) === filters.level) &&
          (!filters.parentId || String(row.parentId) === filters.parentId) &&
          (!filters.isActive || String(row.isActive) === filters.isActive),
      ),
    [filters, rows],
  );

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const toggleStatus = async (row: Occupation, isActive: boolean) => {
    setUpdatingStatus(row.id);
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, isActive } : item,
      ),
    );

    try {
      await occupationApi.updateStatus(row.id, isActive);
    } catch (error) {
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isActive: row.isActive } : item,
        ),
      );
      enqueueSnackbar(
        getErrorMessage(error, translate("common.unknownError")),
        { variant: "error" },
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteSelected = async () => {
    setDeleting(true);
    let success = 0;
    const failures: unknown[] = [];
    const selectedRows = rows
      .filter((row) => selected.includes(row.id))
      .sort((left, right) => right.level - left.level);

    for (const row of selectedRows) {
      try {
        await occupationApi.remove(row.id);
        success += 1;
      } catch (error) {
        failures.push(error);
      }
    }

    if (!failures.length) {
      enqueueSnackbar(
        translate("catalogManagement.deleteSuccess", { count: success }),
        { variant: "success" },
      );
    } else if (success) {
      enqueueSnackbar(
        translate("catalogManagement.deletePartial", {
          success,
          total: selected.length,
        }),
        { variant: "warning" },
      );
    } else {
      enqueueSnackbar(
        getErrorMessage(failures[0], translate("common.unknownError")),
        { variant: "error" },
      );
    }

    setDeleting(false);
    setConfirmDelete(false);
    setSelected([]);
    setPage(0);
    setLoading(true);
    setReloadCount((count) => count + 1);
  };

  const textFilter = (
    key: "occupationCode" | "occupationName",
    label: string,
  ) => (
    <TextField
      fullWidth
      size="small"
      value={filters[key]}
      onChange={(event) => setFilter(key, event.target.value)}
      slotProps={{ htmlInput: { "aria-label": label } }}
    />
  );
  const levelFilter = (
    <TableFilterAutocomplete
      value={filters.level}
      options={[1, 2, 3, 4].map((level) => ({
        value: String(level),
        label: translate("catalogManagement.levelValue", { level }),
      }))}
      ariaLabel={translate("catalogManagement.level")}
      onChange={(value) => setFilter("level", value)}
    />
  );
  const parentFilter = (
    <TableFilterAutocomplete
      value={filters.parentId}
      options={rows
        .filter((row) => row.level < 4)
        .map((row) => ({
          value: String(row.id),
          label: `${row.occupationCode} - ${row.occupationName}`,
        }))}
      ariaLabel={translate("accidentCatalog.parentOccupation")}
      onChange={(value) => setFilter("parentId", value)}
    />
  );
  const statusFilter = (
    <TableFilterAutocomplete
      value={filters.isActive}
      options={[
        { value: "true", label: translate("catalogManagement.inUse") },
        { value: "false", label: translate("catalogManagement.notInUse") },
      ]}
      ariaLabel={translate("catalogManagement.status")}
      onChange={(value) => setFilter("isActive", value)}
    />
  );
  const columns: CatalogColumn<Occupation>[] = [
    {
      key: "occupationCode",
      label: translate("accidentCatalog.occupationCode"),
      width: 110,
      filter: textFilter(
        "occupationCode",
        translate("accidentCatalog.occupationCode"),
      ),
      render: (row) => row.occupationCode,
    },
    {
      key: "occupationName",
      label: translate("accidentCatalog.occupationName"),
      filter: textFilter(
        "occupationName",
        translate("accidentCatalog.occupationName"),
      ),
      render: (row) =>
        `${"\u2014 ".repeat(row.level - 1)}${row.occupationName}`,
    },
    {
      key: "level",
      label: translate("catalogManagement.level"),
      width: 100,
      filter: levelFilter,
      render: (row) =>
        translate("catalogManagement.levelValue", { level: row.level }),
    },
    {
      key: "parent",
      label: translate("accidentCatalog.parentOccupation"),
      width: 280,
      filter: parentFilter,
      render: (row) => {
        const parent = row.parentId ? rowsById.get(row.parentId) : undefined;
        return parent
          ? `${parent.occupationCode} - ${parent.occupationName}`
          : "\u2014";
      },
    },
    {
      key: "status",
      label: translate("catalogManagement.status"),
      width: 120,
      filter: statusFilter,
      render: (row) => (
        <Switch
          size="small"
          checked={row.isActive}
          disabled={updatingStatus === row.id}
          onChange={(event) => toggleStatus(row, event.target.checked)}
          slotProps={{
            input: { "aria-label": translate("catalogManagement.status") },
          }}
        />
      ),
    },
  ];

  return (
    <>
      <CatalogListTable
        title={translate("accidentCatalog.occupationTitle")}
        rows={filteredRows}
        loading={loading}
        columns={columns}
        selected={selected}
        page={page}
        pageSize={pageSize}
        deleting={deleting}
        onSelectedChange={setSelected}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        onEdit={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        onDelete={() => setConfirmDelete(true)}
        onResetFilters={() => {
          setFilters(EMPTY_FILTERS);
          setPage(0);
        }}
        resetFiltersDisabled={!Object.values(filters).some(Boolean)}
        height="calc(100vh - 132px)"
      />

      <OccupationFormDialog
        open={formOpen}
        occupation={editing}
        rows={rows}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setLoading(true);
          setReloadCount((count) => count + 1);
        }}
      />

      <Dialog
        open={confirmDelete}
        onClose={deleting ? undefined : () => setConfirmDelete(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {translate("accidentCatalog.deleteOccupationsTitle")}
        </DialogTitle>
        <DialogContent>
          {translate("accidentCatalog.deleteOccupationsConfirm", {
            count: selected.length,
          })}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            {translate("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={deleteSelected}
            disabled={deleting}
          >
            {translate("users.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
