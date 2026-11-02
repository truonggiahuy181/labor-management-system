// src/app/(main)/admin/users/page.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem,
  Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import KeyIcon from '@mui/icons-material/Key';
import { useSnackbar } from 'notistack';
import ResetPasswordDialog from '@/Components/UserManagement/ResetPasswordDialog';
import { USERS_PATH } from '@/Components/UserManagement/UserDetailForm';
import { ROLE_OPTIONS, roleLabel } from '@/Components/UserManagement/roleOptions';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { adminUserApi, getErrorMessage, type Profile, type UserFilters } from '@/services/user';

// Ô lọc giữ chuỗi; '' = không lọc
type Filters = Record<'fullName' | 'username' | 'email' | 'title' | 'roleId' | 'isActive', string>;
const EMPTY_FILTERS: Filters = { fullName: '', username: '', email: '', title: '', roleId: '', isActive: '' };
const TEXT_COLUMNS = [
  { key: 'fullName', label: 'users.fullName' },
  { key: 'username', label: 'users.username' },
  { key: 'email', label: 'users.email' },
] as const;
const DEBOUNCE_MS = 400;

const toParams = (roleId: string, isActive: string): UserFilters => ({
  ...(roleId && { roleId: Number(roleId) }),
  ...(isActive && { isActive: isActive === 'true' }),
});
const TEXT_FILTERS = ['fullName', 'username', 'email', 'title'] as const;
const matchesText = (u: Profile, f: Filters) => TEXT_FILTERS.every((k) => {
  const q = f[k].trim().toLowerCase();
  return !q || (u[k] ?? '').toLowerCase().includes(q);
 });

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const debouncedFilters = useDebounced(filters, DEBOUNCE_MS);
  const [page, setPage] = useState(0);              // TablePagination đếm từ 0, backend từ 1
  const [pageSize, setPageSize] = useState(10);
  const [allRows, setAllRows] = useState<Profile[]>([]);
  const [reloadCount, setReloadCount] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isAdmin = user?.roleId === ROLE.ADMIN;

  const { roleId, isActive } = debouncedFilters;
  const query = useMemo(() => toParams(roleId, isActive), [roleId, isActive]);
  // Mỗi lần query đổi hoặc bấm tải lại là một request mới; loading đến khi request đó xong
  const requestKey = `${JSON.stringify(query)}#${reloadCount}`;
  const loading = isAdmin && loadedKey !== requestKey;
  const load = () => setReloadCount((n) => n + 1);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;     // bỏ kết quả của request cũ khi người dùng gõ lọc / chuyển trang nhanh
    adminUserApi.list(query)
      .then((res) => {
        if (cancelled) return;
        setAllRows(res);
      })
      .catch((err) => {
        if (!cancelled) enqueueSnackbar(getErrorMessage(err, translate('users.loadFailed')), { variant: 'error' });
      })
      .finally(() => { if (!cancelled) setLoadedKey(requestKey); });
    return () => { cancelled = true; };
  }, [isAdmin, query, requestKey, enqueueSnackbar, translate]);

  const filtered = useMemo(() => allRows.filter((u) => matchesText(u, debouncedFilters)), [allRows, debouncedFilters]);
  const total = filtered.length;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(total / pageSize) - 1)); // sau khi xoá, trang cuối có thể không còn
  const rows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };

  // Chọn theo trang đang xem
  const pageIds = rows.map((r) => r.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked = pageIds.some((id) => selected.includes(id)) && !allChecked;
  const toggleAll = () => setSelected((s) => (allChecked ? s.filter((id) => !pageIds.includes(id)) : [...new Set([...s, ...pageIds])]));
  const toggleOne = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleActive = async (row: Profile, isActive: boolean) => {
    setAllRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, isActive } : r)));
     try {
       await adminUserApi.update(row.id, { isActive });
     } catch (err) {
      setAllRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, isActive: !isActive } : r)));
      enqueueSnackbar(getErrorMessage(err, translate('common.unknownError')), { variant: 'error' });
    }
  };

  const deleteSelected  = async () => {
    // 1. Bỏ tài khoản đang đăng nhập ra khỏi danh sách cần xoá
    const ids = selected.filter((id) => id !== Number(user?.id));

    const softDelete = async (id: number) => {
      if (allRows.find((r) => r.id === id)?.isActive !== false) await adminUserApi.updateStatus(id, false);;
        await adminUserApi.remove(id);
    };

    const results = await Promise.allSettled(ids.map(softDelete));
    // 3. Đếm số request thành công
    const deleted = results.filter((r) => r.status === 'fulfilled').length;

    // 4. Lấy request lỗi đầu tiên (nếu có) để hiện thông báo lỗi của backend
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');

    // 5. Thông báo kết quả
    if (deleted) enqueueSnackbar(translate('users.deleteSuccess', { count: deleted }), { variant: 'success' });
    if (ids.length < selected.length) enqueueSnackbar(translate('users.deleteSelfSkipped'), { variant: 'warning' });
    if (failed) enqueueSnackbar(getErrorMessage(failed.reason, translate('common.unknownError')), { variant: 'error' });

    // 6. Dọn trạng thái và tải lại bảng
    setSelected([]);
    setConfirmDelete(false);
    load();
  };

  // Xuất các dòng đang hiển thị ra CSV (BOM để Excel đọc đúng tiếng Việt)
  const exportCsv = () => {
    const header = ['users.fullName', 'users.username', 'users.email', 'users.role', 'users.jobTitle', 'users.status'].map((k) => translate(k));
    const lines = rows.map((r) => [
      r.fullName, r.username, r.email ?? '', translate(roleLabel(r.roleId) ?? ''), r.title ?? '',
      translate(r.isActive ? 'users.active' : 'users.inactive'),
    ]);
    const csv = [header, ...lines].map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (user && !isAdmin) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }

  const filterCell = { py: 1, px: 1, borderBottom: 1, borderColor: 'divider' };

  return (
    // Bảng cao vừa màn hình: trừ padding trên + dưới của <main> (2 × 24px)
    <Stack spacing={2} sx={{ height: 'calc(100vh - 48px)' }}>
      <Card square elevation={1} sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{translate('users.title')}</Typography>
        {/* Import: chưa có API / thiết kế file mẫu */}
        <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} disabled>{translate('users.import')}</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push(`${USERS_PATH}/create`)}>{translate('users.add')}</Button>
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
                <TableCell rowSpan={2} sx={{ width: 72 }} />
                {TEXT_COLUMNS.map((c) => <TableCell key={c.key} sx={{ fontWeight: 600 }}>{translate(c.label)}</TableCell>)}
                <TableCell sx={{ fontWeight: 600, width: 150 }}>{translate('users.role')}</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150 }}>{translate('users.jobTitle')}</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 160 }}>{translate('users.status')}</TableCell>
              </TableRow>
              {/* Hàng ô lọc ngay dưới tiêu đề cột */}
              <TableRow>
                {TEXT_COLUMNS.map((c) => (
                  <TableCell key={c.key} sx={{ ...filterCell, top: 37 }}>
                    <TextField fullWidth size="small" value={filters[c.key]} onChange={(e) => setFilter(c.key, e.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': translate(c.label) } }} />
                  </TableCell>
                ))}
                <TableCell sx={{ ...filterCell, top: 37 }}>
                  <TextField select fullWidth size="small" value={filters.roleId} onChange={(e) => setFilter('roleId', e.target.value)}
                    slotProps={{ htmlInput: { 'aria-label': translate('users.role') } }}>
                    <MenuItem value="">{translate('users.all')}</MenuItem>
                    {ROLE_OPTIONS.map((o) => <MenuItem key={o.value} value={String(o.value)}>{translate(o.label)}</MenuItem>)}
                  </TextField>
                </TableCell>
                <TableCell sx={{ ...filterCell, top: 37 }}>
                  <TextField fullWidth size="small" value={filters.title} onChange={(e) => setFilter('title', e.target.value)}
                    slotProps={{ htmlInput: { 'aria-label': translate('users.jobTitle') } }} />
                </TableCell>
                <TableCell sx={{ ...filterCell, top: 37 }}>
                  <TextField select fullWidth size="small" value={filters.isActive} onChange={(e) => setFilter('isActive', e.target.value)}
                    slotProps={{ htmlInput: { 'aria-label': translate('users.status') } }}>
                    <MenuItem value="">{translate('users.all')}</MenuItem>
                    <MenuItem value="true">{translate('users.active')}</MenuItem>
                    <MenuItem value="false">{translate('users.inactive')}</MenuItem>
                  </TextField>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover selected={selected.includes(r.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={translate('users.edit')}>
                      <IconButton size="small" onClick={() => router.push(`${USERS_PATH}/${r.id}`)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={translate('users.resetPassword')}>
                      <IconButton size="small" onClick={() => setResetting(r)}><KeyIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{r.fullName}</TableCell>
                  <TableCell>{r.username}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{roleLabel(r.roleId) ? translate(roleLabel(r.roleId)!) : translate('account.roleUnknown', { id: r.roleId })}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>
                    <Switch size="small" checked={r.isActive} disabled={r.id === Number(user?.id)}
                      onChange={(e) => toggleActive(r, e.target.checked)}
                      slotProps={{ input: { 'aria-label': translate('users.status') } }} />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
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
          <Button size="small" color="inherit" startIcon={<FileDownloadOutlinedIcon />} onClick={exportCsv} disabled={!rows.length}
            sx={{ color: 'text.secondary' }}>
            {translate('users.exportData')}
          </Button>
          <TablePagination component="div" sx={{ ml: 'auto' }} count={total} page={currentPage} rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage=""
            labelDisplayedRows={({ from, to, count }) => translate('users.of', { from, to, count })}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} />
        </Stack>
      </Card>

      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('users.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>{translate('users.deleteConfirm', { count: selected.length })}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(false)}>{translate('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={deleteSelected}>{translate('users.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}