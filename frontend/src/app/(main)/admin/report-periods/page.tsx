'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSnackbar } from 'notistack';
import ReportPeriodFormDialog from '@/Components/ReportPeriodManagement/ReportPeriodFormDialog';
import TableFilterAutocomplete from '@/Components/TableFilterAutocomplete';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE } from '@/constants/roles';
import { reportPeriodApi, type ReportPeriod } from '@/services/reportPeriod';
import { getErrorMessage } from '@/services/user';

type Filters = {
  reportYear: string;
  reportName: string;
  reportPeriod: string;
  startDate: string;
  endDate: string;
  isActive: string;
};

const EMPTY_FILTERS: Filters = {
  reportYear: '',
  reportName: '',
  reportPeriod: '',
  startDate: '',
  endDate: '',
  isActive: '',
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export default function ReportPeriodsPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.roleId === ROLE.ADMIN;
  const [rows, setRows] = useState<ReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReportPeriod | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    reportPeriodApi.list(true)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error) => {
        if (!cancelled) {
          enqueueSnackbar(
            getErrorMessage(error, translate('reportPeriods.loadFailed')),
            { variant: 'error' },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enqueueSnackbar, isAdmin, reloadCount, translate]);

  const reportNames = useMemo(
    () => [...new Set(rows.map((row) => row.reportName))].sort((a, b) => a.localeCompare(b, 'vi')),
    [rows],
  );

  const reportPeriods = useMemo(
    () => [...new Set(rows.map((row) => row.reportPeriod))]
      .sort((a, b) => a.localeCompare(b, 'vi')),
    [rows],
  );

  const filteredRows = useMemo(() => rows.filter((row) => (
    (!filters.reportYear || String(row.reportYear).includes(filters.reportYear.trim()))
    && (!filters.reportName || row.reportName === filters.reportName)
    && (!filters.reportPeriod || row.reportPeriod === filters.reportPeriod)
    && (!filters.startDate || row.startDate.slice(0, 10) === filters.startDate)
    && (!filters.endDate || row.endDate.slice(0, 10) === filters.endDate)
    && (!filters.isActive || String(row.isActive) === filters.isActive)
  )), [filters, rows]);

  const lastPage = Math.max(0, Math.ceil(filteredRows.length / pageSize) - 1);
  const safePage = Math.min(page, lastPage);
  const pageRows = filteredRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const toggleStatus = async (row: ReportPeriod, isActive: boolean) => {
    setUpdatingStatus(row.id);
    setRows((current) => current.map((item) => (
      item.id === row.id ? { ...item, isActive } : item
    )));
    try {
      await reportPeriodApi.updateStatus(row.id, isActive);
    } catch (error) {
      setRows((current) => current.map((item) => (
        item.id === row.id ? { ...item, isActive: row.isActive } : item
      )));
      enqueueSnackbar(getErrorMessage(error, translate('common.unknownError')), { variant: 'error' });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: ReportPeriod) => {
    setEditing(row);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);
  const handleSaved = () => {
    setFormOpen(false);
    setLoading(true);
    setReloadCount((count) => count + 1);
  };

  if (user && !isAdmin) {
    return <Typography color="text.secondary">{translate('users.adminOnly')}</Typography>;
  }

  const filterFieldSx = {
    minWidth: 120,
    '& .MuiInputBase-root': { bgcolor: 'background.paper' },
  };

  return (
    <>
      <Stack spacing={2} sx={{ height: 'calc(100vh - 48px)' }}>
        <Card
          square
          elevation={1}
          sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Typography sx={{ flex: 1, fontWeight: 700 }}>
            {translate('reportPeriods.title')}
          </Typography>
          <Tooltip title={translate('common.resetFilters')}>
            <span>
              <IconButton
                color="primary"
                disabled={!Object.values(filters).some(Boolean)}
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(0);
                }}
                aria-label={translate('common.resetFilters')}
              >
                <RestartAltIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            {translate('users.add')}
          </Button>
        </Card>

        <Card square sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', zIndex: 4 }} />
          )}
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1040 }}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ width: 76, fontWeight: 600 }}>
                    {translate('businessRegister.actions')}
                  </TableCell>
                  <TableCell sx={{ width: 135, fontWeight: 600 }}>
                    {translate('reportPeriods.reportYear')}
                  </TableCell>
                  <TableCell sx={{ minWidth: 300, fontWeight: 600 }}>
                    {translate('reportPeriods.reportName')}
                  </TableCell>
                  <TableCell sx={{ width: 180, fontWeight: 600 }}>
                    {translate('reportPeriods.reportPeriod')}
                  </TableCell>
                  <TableCell sx={{ width: 170, fontWeight: 600 }}>
                    {translate('reportPeriods.startDate')}
                  </TableCell>
                  <TableCell sx={{ width: 170, fontWeight: 600 }}>
                    {translate('reportPeriods.endDate')}
                  </TableCell>
                  <TableCell sx={{ width: 140, fontWeight: 600 }}>
                    {translate('reportPeriods.status')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={filters.reportYear}
                      onChange={(event) => setFilter('reportYear', event.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': translate('reportPeriods.reportYear'), min: 2000, max: 2100 } }}
                      sx={filterFieldSx}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TableFilterAutocomplete
                      value={filters.reportName}
                      options={reportNames.map((name) => ({ value: name, label: name }))}
                      ariaLabel={translate('reportPeriods.reportName')}
                      onChange={(value) => setFilter('reportName', value)}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TableFilterAutocomplete
                      value={filters.reportPeriod}
                      options={reportPeriods.map((period) => ({ value: period, label: period }))}
                      ariaLabel={translate('reportPeriods.reportPeriod')}
                      onChange={(value) => setFilter('reportPeriod', value)}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={filters.startDate}
                      onChange={(event) => setFilter('startDate', event.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': translate('reportPeriods.startDate') } }}
                      sx={filterFieldSx}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={filters.endDate}
                      onChange={(event) => setFilter('endDate', event.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': translate('reportPeriods.endDate') } }}
                      sx={filterFieldSx}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 1, py: 1, top: 37 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={filters.isActive}
                      onChange={(event) => setFilter('isActive', event.target.value)}
                      slotProps={{ select: { displayEmpty: true } }}
                      sx={filterFieldSx}
                    >
                      <MenuItem value=""><em>{translate('users.all')}</em></MenuItem>
                      <MenuItem value="true">{translate('reportPeriods.active')}</MenuItem>
                      <MenuItem value="false">{translate('reportPeriods.inactive')}</MenuItem>
                    </TextField>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Tooltip title={translate('users.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(row)}
                          aria-label={translate('users.edit')}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.reportYear}</TableCell>
                    <TableCell>{row.reportName}</TableCell>
                    <TableCell>{row.reportPeriod}</TableCell>
                    <TableCell>{formatDate(row.startDate)}</TableCell>
                    <TableCell>{formatDate(row.endDate)}</TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={row.isActive}
                        disabled={updatingStatus === row.id}
                        onChange={(event) => toggleStatus(row, event.target.checked)}
                        slotProps={{ input: { 'aria-label': translate('reportPeriods.status') } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 7, color: 'text.secondary' }}>
                      {translate('users.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredRows.length}
            page={safePage}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage=""
            labelDisplayedRows={({ from, to, count }) => translate('users.of', { from, to, count })}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            sx={{ borderTop: 1, borderColor: 'divider' }}
          />
        </Card>
      </Stack>

      <ReportPeriodFormDialog
        open={formOpen}
        item={editing}
        reportNames={reportNames}
        reportPeriods={reportPeriods}
        onClose={closeForm}
        onSaved={handleSaved}
      />
    </>
  );
}
