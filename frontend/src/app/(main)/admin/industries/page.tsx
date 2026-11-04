'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, Button, Switch, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import CatalogListTable, { type CatalogColumn } from '@/Components/CatalogManagement/CatalogListTable';
import IndustryFormDialog from '@/Components/CatalogManagement/IndustryFormDialog';
import TableFilterAutocomplete from '@/Components/TableFilterAutocomplete';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { industryApi, type Industry } from '@/services/enterprise';
import { getErrorMessage } from '@/services/user';

type Filters = { industryCode: string; industryName: string; level: string; isActive: string };
const EMPTY_FILTERS: Filters = { industryCode: '', industryName: '', level: '', isActive: '' };
const includes = (value: string, keyword: string) => value.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase());

export default function IndustriesPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.roleId === ROLE.ADMIN;
  const [rows, setRows] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Industry | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    industryApi.list({ includeInactive: true })
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((error) => {
        if (!cancelled) enqueueSnackbar(
          getErrorMessage(error, translate('catalogManagement.loadIndustriesFailed')),
          { variant: 'error' },
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enqueueSnackbar, isAdmin, reloadCount, translate]);

  const filteredRows = useMemo(() => rows.filter((row) => (
    includes(row.industryCode, filters.industryCode)
    && includes(row.industryName, filters.industryName)
    && (!filters.level || String(row.level) === filters.level)
    && (!filters.isActive || String(row.isActive) === filters.isActive)
  )), [filters, rows]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const toggleStatus = async (row: Industry, isActive: boolean) => {
    setUpdatingStatus(row.id);
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isActive } : item)));
    try {
      await industryApi.updateStatus(row.id, isActive);
    } catch (error) {
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isActive: row.isActive } : item)));
      enqueueSnackbar(getErrorMessage(error, translate('common.unknownError')), { variant: 'error' });
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
        if (row.isActive) await industryApi.updateStatus(row.id, false);
        await industryApi.remove(row.id);
        success += 1;
      } catch (error) {
        failures.push(error);
      }
    }

    if (!failures.length) {
      enqueueSnackbar(translate('catalogManagement.deleteSuccess', { count: success }), { variant: 'success' });
    } else if (success) {
      enqueueSnackbar(translate('catalogManagement.deletePartial', { success, total: selected.length }), { variant: 'warning' });
    } else {
      enqueueSnackbar(getErrorMessage(failures[0], translate('common.unknownError')), { variant: 'error' });
    }
    setDeleting(false);
    setConfirmDelete(false);
    setSelected([]);
    setPage(0);
    setLoading(true);
    setReloadCount((count) => count + 1);
  };

  const textFilter = (key: 'industryCode' | 'industryName', label: string) => (
    <TextField
      fullWidth
      size="small"
      value={filters[key]}
      onChange={(event) => setFilter(key, event.target.value)}
      slotProps={{ htmlInput: { 'aria-label': label } }}
    />
  );
  const levelFilter = (
    <TableFilterAutocomplete
      value={filters.level}
      options={[1, 2, 3, 4].map((level) => ({
        value: String(level),
        label: translate('catalogManagement.levelValue', { level }),
      }))}
      ariaLabel={translate('catalogManagement.level')}
      onChange={(value) => setFilter('level', value)}
    />
  );
  const statusFilter = (
    <TableFilterAutocomplete
      value={filters.isActive}
      options={[
        { value: 'true', label: translate('catalogManagement.inUse') },
        { value: 'false', label: translate('catalogManagement.notInUse') },
      ]}
      ariaLabel={translate('catalogManagement.status')}
      onChange={(value) => setFilter('isActive', value)}
    />
  );
  const columns: CatalogColumn<Industry>[] = [
    {
      key: 'industryCode',
      label: translate('catalogManagement.industryCode'),
      width: 140,
      filter: textFilter('industryCode', translate('catalogManagement.industryCode')),
      render: (row) => row.industryCode,
    },
    {
      key: 'industryName',
      label: translate('catalogManagement.industryName'),
      filter: textFilter('industryName', translate('catalogManagement.industryName')),
      render: (row) => `${'— '.repeat(row.level - 1)}${row.industryName}`,
    },
    {
      key: 'level',
      label: translate('catalogManagement.level'),
      width: 120,
      filter: levelFilter,
      render: (row) => translate('catalogManagement.levelValue', { level: row.level }),
    },
    {
      key: 'status',
      label: translate('catalogManagement.status'),
      width: 150,
      filter: statusFilter,
      render: (row) => (
        <Switch
          size="small"
          checked={row.isActive}
          disabled={updatingStatus === row.id}
          onChange={(event) => toggleStatus(row, event.target.checked)}
          slotProps={{ input: { 'aria-label': translate('catalogManagement.status') } }}
        />
      ),
    },
  ];

  if (user && !isAdmin) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }

  return (
    <>
      <CatalogListTable
        title={translate('catalogManagement.industryTitle')}
        rows={filteredRows}
        loading={loading}
        columns={columns}
        selected={selected}
        page={page}
        pageSize={pageSize}
        deleting={deleting}
        onSelectedChange={setSelected}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
        onAdd={() => { setEditing(null); setFormOpen(true); }}
        onEdit={(row) => { setEditing(row); setFormOpen(true); }}
        onDelete={() => setConfirmDelete(true)}
        onResetFilters={() => { setFilters(EMPTY_FILTERS); setPage(0); }}
        resetFiltersDisabled={!Object.values(filters).some(Boolean)}
      />

      <IndustryFormDialog
        open={formOpen}
        industry={editing}
        rows={rows}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); setLoading(true); setReloadCount((count) => count + 1); }}
      />

      <Dialog open={confirmDelete} onClose={deleting ? undefined : () => setConfirmDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('catalogManagement.deleteIndustriesTitle')}</DialogTitle>
        <DialogContent>{translate('catalogManagement.deleteConfirm', { count: selected.length })}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>{translate('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={deleteSelected} disabled={deleting}>{translate('users.delete')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
