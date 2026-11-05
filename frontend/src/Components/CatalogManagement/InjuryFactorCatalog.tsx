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
import InjuryFactorFormDialog from "./InjuryFactorFormDialog";
import TableFilterAutocomplete from "@/Components/TableFilterAutocomplete";
import useLocales from "@/Hooks/useLocales";
import { injuryFactorApi, type InjuryFactor } from "@/services/accidentCatalog";
import { getErrorMessage } from "@/services/user";

type Filters = {
  factorCode: string;
  factorName: string;
  isActive: string;
};

const EMPTY_FILTERS: Filters = {
  factorCode: "",
  factorName: "",
  isActive: "",
};
const includes = (value: string, keyword: string) =>
  value.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase());

export default function InjuryFactorCatalog() {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState<InjuryFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InjuryFactor | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    injuryFactorApi
      .list({ includeInactive: true })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(
            getErrorMessage(
              error,
              translate("accidentCatalog.loadInjuryFactorsFailed"),
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

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          includes(row.factorCode, filters.factorCode) &&
          includes(row.factorName, filters.factorName) &&
          (!filters.isActive || String(row.isActive) === filters.isActive),
      ),
    [filters, rows],
  );

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const toggleStatus = async (row: InjuryFactor, isActive: boolean) => {
    setUpdatingStatus(row.id);
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, isActive } : item,
      ),
    );
    try {
      await injuryFactorApi.updateStatus(row.id, isActive);
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
    for (const id of selected) {
      try {
        await injuryFactorApi.remove(id);
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

  const textFilter = (key: "factorCode" | "factorName", label: string) => (
    <TextField
      fullWidth
      size="small"
      value={filters[key]}
      onChange={(event) => setFilter(key, event.target.value)}
      slotProps={{ htmlInput: { "aria-label": label } }}
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
  const columns: CatalogColumn<InjuryFactor>[] = [
    {
      key: "factorCode",
      label: translate("accidentCatalog.injuryFactorCode"),
      width: 160,
      filter: textFilter(
        "factorCode",
        translate("accidentCatalog.injuryFactorCode"),
      ),
      render: (row) => row.factorCode,
    },
    {
      key: "factorName",
      label: translate("accidentCatalog.injuryFactorName"),
      filter: textFilter(
        "factorName",
        translate("accidentCatalog.injuryFactorName"),
      ),
      render: (row) => row.factorName,
    },
    {
      key: "status",
      label: translate("catalogManagement.status"),
      width: 150,
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
        title={translate("accidentCatalog.injuryFactorTitle")}
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

      <InjuryFactorFormDialog
        open={formOpen}
        injuryFactor={editing}
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
          {translate("accidentCatalog.deleteInjuryFactorsTitle")}
        </DialogTitle>
        <DialogContent>
          {translate("accidentCatalog.deleteInjuryFactorsConfirm", {
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
