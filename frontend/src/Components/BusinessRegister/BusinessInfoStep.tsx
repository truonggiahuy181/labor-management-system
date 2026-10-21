// src/Components/BusinessRegister/BusinessInfoStep.tsx
// Bước 1 – Thông tin doanh nghiệp: thông tin DN (bắt buộc), thông tin liên hệ, file đính kèm.
'use client';
import { useRef } from 'react';
import { Controller, type RegisterOptions, type UseFormReturn } from 'react-hook-form';
import {
  Box, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import useLocales from '@/Hooks/useLocales';
import type { BusinessFiles, BusinessInfo } from '@/services/business';
import { BUSINESS_TYPES, INDUSTRIES, PROVINCES, wardsOf, type Option } from './options';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9}$/;
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
const ACCEPT = '.pdf,.jpg,.jpeg,.png';

type FieldDef = {
  name: keyof BusinessInfo;
  label: string;
  required?: boolean;
  rules?: RegisterOptions<BusinessInfo, keyof BusinessInfo>;
  options?: Option[];
  type?: 'date';
  span?: 1 | 2 | 3;     // số cột chiếm trên lưới 3 cột
};

type Props = {
  form: UseFormReturn<BusinessInfo>;
  files: BusinessFiles;
  onFilesChange: (files: BusinessFiles) => void;
};

export default function BusinessInfoStep({ form, files, onFilesChange }: Props) {
  const { translate } = useLocales();
  const { control, watch, setValue } = form;
  const t = (key: string) => translate(`businessRegister.${key}`);
  const pattern = (value: RegExp, key: string) => ({ value, message: t(key) });

  const province = watch('province');
  const operatingProvince = watch('operatingProvince');

  const companyFields: FieldDef[] = [
    { name: 'companyName', label: t('companyName'), required: true },
    { name: 'taxCode', label: t('taxCode'), required: true, rules: { pattern: pattern(TAX_CODE_RE, 'invalidTaxCode') } },
    { name: 'businessType', label: t('businessType'), required: true, options: BUSINESS_TYPES },
    { name: 'mainIndustry', label: t('mainIndustry'), required: true, options: INDUSTRIES },
    { name: 'licenseDate', label: t('licenseDate'), required: true, type: 'date' },
    { name: 'province', label: t('province'), required: true, options: PROVINCES },
    { name: 'ward', label: t('ward'), required: true, options: wardsOf(province) },
    { name: 'address', label: t('address'), required: true, span: 2 },
  ];

  const contactFields: FieldDef[] = [
    { name: 'foreignName', label: t('foreignName') },
    { name: 'email', label: t('email'), required: true, rules: { pattern: pattern(EMAIL_RE, 'invalidEmail') } },
    { name: 'officePhone', label: t('officePhone') },
    { name: 'leaderName', label: t('leaderName') },
    { name: 'leaderPhone', label: t('leaderPhone'), rules: { pattern: pattern(PHONE_RE, 'invalidPhone') } },
    { name: 'operatingProvince', label: t('operatingProvince'), options: PROVINCES },
    { name: 'operatingWard', label: t('operatingWard'), options: wardsOf(operatingProvince) },
    { name: 'businessLocation', label: t('businessLocation'), span: 2 },
  ];

  const renderField = ({ name, label, required, rules, options, type, span = 1 }: FieldDef) => (
    <Box key={name} sx={{ gridColumn: { xs: 'span 1', md: `span ${span}` } }}>
      <Controller
        name={name}
        control={control}
        rules={{ ...rules, required: required ? translate('common.required') : false }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            fullWidth
            size="small"
            label={label}
            required={required}
            type={type}
            select={!!options}
            disabled={!!options && options.length === 0}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
            onChange={(e) => {
              field.onChange(e);
              // Đổi tỉnh → xoá phường/xã đã chọn
              if (name === 'province') setValue('ward', '');
              if (name === 'operatingProvince') setValue('operatingWard', '');
            }}
            slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
          >
            {options?.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        )}
      />
    </Box>
  );

  const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' } };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Section title={t('companySection')}>
        <Box sx={grid}>{companyFields.map(renderField)}</Box>
      </Section>

      <Section title={t('contactSection')}>
        <Box sx={grid}>{contactFields.map(renderField)}</Box>
      </Section>

      <Section title={t('filesSection')}>
        <FilesTable files={files} onChange={onFilesChange} />
      </Section>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

/** Bảng file đính kèm: xem / tải lên / xoá cho từng loại giấy tờ */
export function FilesTable({ files, onChange }: { files: BusinessFiles; onChange?: (f: BusinessFiles) => void }) {
  const { translate } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const rows: { key: keyof BusinessFiles; label: string }[] = [
    { key: 'businessLicense', label: t('businessLicense') },
    { key: 'otherDocument', label: t('otherDocument') },
  ];

  const view = (file: File | null) => file && window.open(URL.createObjectURL(file), '_blank');

  return (
    <Table size="small">
      <TableHead sx={{ bgcolor: 'grey.100' }}>
        <TableRow>
          <TableCell>{t('fileName')}</TableCell>
          <TableCell>{t('fileInfo')}</TableCell>
          <TableCell align="right">{t('actions')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(({ key, label }) => (
          <TableRow key={key}>
            <TableCell>{label}</TableCell>
            <TableCell>{files[key]?.name ?? ''}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title={t('view')}>
                <span><IconButton size="small" disabled={!files[key]} onClick={() => view(files[key])}><VisibilityOutlined fontSize="small" /></IconButton></span>
              </Tooltip>
              {onChange && (
                <>
                  <Tooltip title={t('upload')}>
                    <IconButton size="small" onClick={() => inputs.current[key]?.click()}><FileUploadOutlined fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('remove')}>
                    <span><IconButton size="small" disabled={!files[key]} onClick={() => onChange({ ...files, [key]: null })}><DeleteOutlined fontSize="small" /></IconButton></span>
                  </Tooltip>
                  <input
                    hidden
                    type="file"
                    accept={ACCEPT}
                    ref={(el) => { inputs.current[key] = el; }}
                    onChange={(e) => {
                      onChange({ ...files, [key]: e.target.files?.[0] ?? null });
                      e.target.value = '';   // chọn lại cùng file vẫn kích hoạt onChange
                    }}
                  />
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
