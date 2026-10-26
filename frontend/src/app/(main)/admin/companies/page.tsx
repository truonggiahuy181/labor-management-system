'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem,
  Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import KeyIcon from '@mui/icons-material/Key';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useSnackbar } from 'notistack';
import BusinessRegisterDialog from '@/Components/BusinessRegister/BusinessRegisterDialog';
import ConfirmStep from '@/Components/BusinessRegister/ConfirmStep';
import ResetPasswordDialog from '@/Components/UserManagement/ResetPasswordDialog';
import useAuth from '@/Hooks/useAuth';
import useCatalogs, { type Option } from '@/Hooks/useCatalogs';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { enterpriseApi, toBusinessInfo, type Enterprise } from '@/services/enterprise';
import { adminUserApi, getErrorMessage, type Profile } from '@/services/user';

// Ô lọc giữ chuỗi; '' = không lọc
type Filters = Record<'enterpriseName' | 'taxCode' | 'businessTypeId' | 'industryId' | 'wardId' | 'isActive', string>;
const EMPTY_FILTERS: Filters = { enterpriseName: '', taxCode: '', businessTypeId: '', industryId: '', wardId: '', isActive: '' };

const includes = (value: string | null, keyword: string) => (value ?? '').toLowerCase().includes(keyword.trim().toLowerCase());

const matches = (e: Enterprise, f: Filters) =>
  includes(e.enterpriseName, f.enterpriseName)
  && includes(e.taxCode, f.taxCode)
  && (!f.businessTypeId || String(e.businessTypeId) === f.businessTypeId)
  && (!f.industryId || String(e.industryId) === f.industryId)
  && (!f.wardId || e.wardId === f.wardId)
  && (!f.isActive || String(e.isActive) === f.isActive);

export default function CompaniesPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const catalogs = useCatalogs();
  const isAdmin = user?.roleId === ROLE.ADMIN;

  const [rows, setRows] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [viewing, setViewing] = useState<Enterprise | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const load = () => { setLoading(true); setReloadCount((n) => n + 1); };

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    enterpriseApi.list()
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((err) => {
        if (!cancelled) enqueueSnackbar(getErrorMessage(err, translate('enterprises.loadFailed')), { variant: 'error' });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin, reloadCount, enqueueSnackbar, translate]);

  const filtered = useMemo(() => rows.filter((e) => matches(e, filters)), [rows, filters]);
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };

  // Chọn theo trang đang xem
  const pageIds = pageRows.map((r) => r.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked = pageIds.some((id) => selected.includes(id)) && !allChecked;
  const toggleAll = () => setSelected((s) => (allChecked ? s.filter((id) => !pageIds.includes(id)) : [...new Set([...s, ...pageIds])]));
  const toggleOne = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleActive = async (row: Enterprise, isActive: boolean) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, isActive } : r)));
    try {
      await enterpriseApi.updateStatus(row.id, isActive);
    } catch (err) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, isActive: !isActive } : r)));
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  // Tài khoản của doanh nghiệp: user có enterpriseId trùng, hoặc username = mã số thuế
  const openResetPassword = async (row: Enterprise) => {
    try {
      const { data } = await adminUserApi.list({ pageNumber: 1, pageSize: 1000 });
      const account = data.find((u) => u.enterpriseId === row.id) ?? data.find((u) => u.username === row.taxCode);
      if (account) setResetting(account);
      else enqueueSnackbar(translate('enterprises.accountNotFound'), { variant: 'warning' });
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  const deleteSelected = async () => {
    try {
      const { deleted } = await enterpriseApi.remove(selected);
      enqueueSnackbar(translate('enterprises.deleteSuccess', { count: deleted }), { variant: 'success' });
      setSelected([]);
      load();
    } catch (err) {
      // Backend chưa có DELETE /enterprises (BACKEND_CHANGES.md) → 404
      const notSupported = (err as { response?: { status?: number } })?.response?.status === 404;
      enqueueSnackbar(
        notSupported ? translate('enterprises.deleteNotSupported') : getErrorMessage(err, translate('common.unknownError')),
        { variant: 'error' },
      );
    } finally {
      setConfirmDelete(false);
    }
  };

  const openForm = (e: Enterprise | null) => { setEditing(e); setFormOpen(true); };

  if (user && !isAdmin) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }

  const filterCell = { py: 1, px: 1, borderBottom: 1, borderColor: 'divider', top: 37 };
  const textFilter = (key: keyof Filters, label: string) => (
    <TableCell sx={filterCell}>
      <TextField fullWidth size="small" value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}
        slotProps={{ htmlInput: { 'aria-label': label } }} />
    </TableCell>
  );
  const selectFilter = (key: keyof Filters, label: string, options: Option[]) => (
    <TableCell sx={filterCell}>
      <TextField select fullWidth size="small" value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}
        slotProps={{ htmlInput: { 'aria-label': label } }}>
        <MenuItem value="">{translate('users.all')}</MenuItem>
        {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>
    </TableCell>
  );

  const columns = [
    { key: 'enterpriseName', label: translate('businessRegister.companyName'), width: undefined },
    { key: 'taxCode', label: translate('businessRegister.taxCode'), width: 120 },
    { key: 'businessTypeId', label: translate('businessRegister.businessType'), width: 150 },
    { key: 'industryId', label: translate('enterprises.industry'), width: 180 },
    { key: 'wardId', label: translate('enterprises.ward'), width: 140 },
    { key: 'isActive', label: translate('users.status'), width: 100 },
  ] as const;
  const statusOptions: Option[] = [
    { value: 'true', label: translate('users.active') },
    { value: 'false', label: translate('users.inactive') },
  ];

  return (
    // Bảng cao vừa màn hình: trừ AppBar 64px và padding trên + dưới của <main> (2 × 24px)
    <Stack spacing={2} sx={{ height: 'calc(100vh - 64px - 48px)' }}>
      <Card square elevation={1} sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{translate('enterprises.title')}</Typography>
        {/* Thêm từ file: chưa có API / file mẫu */}
        <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} disabled>{translate('enterprises.importFile')}</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>{translate('users.add')}</Button>
      </Card>

      <Card square sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 }} />}
        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" rowSpan={2}>
                  <Checkbox size="small" checked={allChecked} indeterminate={someChecked} onChange={toggleAll} />
                </TableCell>
                <TableCell rowSpan={2} sx={{ width: 110, fontWeight: 600 }}>{translate('businessRegister.actions')}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} sx={{ fontWeight: 600, width: c.width, minWidth: c.width ?? 200 }}>{c.label}</TableCell>
                ))}
              </TableRow>
              {/* Hàng ô lọc ngay dưới tiêu đề cột */}
              <TableRow>
                {textFilter('enterpriseName', columns[0].label)}
                {textFilter('taxCode', columns[1].label)}
                {selectFilter('businessTypeId', columns[2].label, catalogs.businessTypeOptions)}
                {selectFilter('industryId', columns[3].label, catalogs.industryOptions)}
                {selectFilter('wardId', columns[4].label, catalogs.allWardOptions)}
                {selectFilter('isActive', columns[5].label, statusOptions)}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} hover selected={selected.includes(r.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={translate('businessRegister.view')}>
                      <IconButton size="small" onClick={() => setViewing(r)}><VisibilityOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={translate('users.edit')}>
                      <IconButton size="small" onClick={() => openForm(r)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={translate('users.resetPassword')}>
                      <IconButton size="small" onClick={() => openResetPassword(r)}><KeyIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{r.enterpriseName}</TableCell>
                  <TableCell>{r.taxCode}</TableCell>
                  <TableCell>{catalogs.businessTypeLabel(r.businessTypeId)}</TableCell>
                  <TableCell>{catalogs.industryLabel(r.industryId)}</TableCell>
                  <TableCell>{catalogs.wardLabel(r.provinceId, r.wardId) || r.wardId}</TableCell>
                  <TableCell>
                    <Switch size="small" checked={r.isActive} onChange={(e) => toggleActive(r, e.target.checked)}
                      slotProps={{ input: { 'aria-label': translate('users.status') } }} />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>{translate('users.noData')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Thanh thao tác khi có dòng được chọn */}
        {selected.length > 0 && (
          <Paper elevation={4} sx={{ position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 1.5, pl: 0, pr: 1, py: 0.5, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'common.white', px: 1.5, py: 0.75, fontWeight: 700, fontSize: 13 }}>
              {selected.length}
            </Box>
            <Typography variant="body2">{translate('users.selected')}</Typography>
            <Button size="small" variant="contained" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDelete(true)}>
              {translate('users.delete')}
            </Button>
            <IconButton size="small" onClick={() => setSelected([])} aria-label={translate('users.clearSelection')}><CloseIcon fontSize="small" /></IconButton>
          </Paper>
        )}

        <Stack direction="row" sx={{ alignItems: 'center', borderTop: 1, borderColor: 'divider', px: 1 }}>
          <TablePagination component="div" sx={{ ml: 'auto' }} count={filtered.length} page={page} rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage=""
            labelDisplayedRows={({ from, to, count }) => translate('users.of', { from, to, count })}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} />
        </Stack>
      </Card>

      {/* Dùng chung form với luồng Đăng ký doanh nghiệp */}
      <BusinessRegisterDialog mode="admin" open={formOpen} enterprise={editing} catalog={catalogs.catalog}
        onClose={() => setFormOpen(false)} onCreated={load} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />

      {/* Xem chi tiết (chỉ đọc) */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('enterprises.detailTitle')}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'grey.50' }}>
          {viewing && <ConfirmStep info={toBusinessInfo(viewing)} catalog={catalogs.catalog} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setViewing(null)}>{translate('businessRegister.close')}</Button>
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => { openForm(viewing); setViewing(null); }}>
            {translate('users.edit')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('enterprises.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>{translate('enterprises.deleteConfirm', { count: selected.length })}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(false)}>{translate('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={deleteSelected}>{translate('users.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}