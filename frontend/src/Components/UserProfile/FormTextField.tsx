// src/Components/UserProfile/FormTextField.tsx
// Ô nhập nối với react-hook-form: hiện lỗi dưới ô; có options thì thành ô chọn
'use client';
import { Controller, type Control, type ControllerProps, type FieldValues, type Path } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import useLocales from '@/Hooks/useLocales';
import type { Option } from './options';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;                       // key dịch
  rules?: ControllerProps<T, Path<T>>['rules'];
  options?: Option[];
  translateLabels?: boolean;           // false khi tên lựa chọn lấy từ API (tỉnh/phường)
  required?: boolean;                  // hiện dấu * khi ô không có rules.required (vd. ô bị khoá)
  disabled?: boolean;
  type?: string;
};

export default function FormTextField<T extends FieldValues>({
  control, name, label, rules, options, translateLabels = true, required, disabled, type,
}: Props<T>) {
  const { translate } = useLocales();
  return (
    <Controller name={name} control={control} rules={rules}
      render={({ field, fieldState }) => (
        <TextField {...field} fullWidth size="small" label={translate(label)} select={!!options} type={type}
          disabled={disabled} required={required ?? !!rules?.required}
          error={!!fieldState.error} helperText={fieldState.error?.message}
          slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}>
          {options?.map((o) => (
            <MenuItem key={o.value} value={o.value}>{translateLabels ? translate(o.label) : o.label}</MenuItem>
          ))}
        </TextField>
      )} />
  );
}