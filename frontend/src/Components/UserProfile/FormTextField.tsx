// src/Components/UserProfile/FormTextField.tsx
// Ô nhập nối với react-hook-form: hiện lỗi dưới ô; có options thì thành ô chọn
'use client';
import { Controller, type Control, type ControllerProps, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, createFilterOptions, MenuItem, TextField } from '@mui/material';
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
  max?: string;
  searchable?: boolean;               // cho phép gõ để tìm/chọn option (vd. tỉnh/phường)
  onChange?: (value: unknown) => void;
  hint?: string;                       // dòng gợi ý dưới ô (đã dịch), lỗi kiểm tra sẽ hiện thay chỗ này
};

const filterOptions = createFilterOptions<Option>({
  stringify: (option) => `${option.label} ${option.value}`,
});

export default function FormTextField<T extends FieldValues>({
  control, name, label, rules, options, translateLabels = true, required, disabled, type, max, searchable = false, onChange, hint,
}: Props<T>) {
  const { translate } = useLocales();
  return (
    <Controller name={name} control={control} rules={rules}
      render={({ field, fieldState }) => {
        const isUnknown = !!(options && field.value && !options.some((o) => o.value === field.value));
        if (searchable && options) {
          const unknownOption = isUnknown
            ? { value: String(field.value), label: String(field.value) }
            : null;
          const availableOptions = unknownOption ? [unknownOption, ...options] : options;
          const selectedOption = availableOptions.find((option) => option.value === field.value) ?? null;

          return (
            <Autocomplete
              fullWidth
              size="small"
              options={availableOptions}
              value={selectedOption}
              disabled={disabled}
              autoHighlight
              autoSelect
              openOnFocus
              selectOnFocus
              filterOptions={filterOptions}
              getOptionLabel={(option) => translateLabels ? translate(option.label) : option.label}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              onBlur={field.onBlur}
              onChange={(_, option) => {
                const value = option?.value ?? '';
                field.onChange(value);
                onChange?.(value);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  name={field.name}
                  label={translate(label)}
                  required={required ?? !!rules?.required}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          );
        }

        return (
          <TextField {...field} fullWidth size="small" label={translate(label)} select={!!options} type={type}
            disabled={disabled} required={required ?? !!rules?.required}
            error={!!fieldState.error} helperText={fieldState.error?.message ?? hint}
            onChange={(e) => {
              field.onChange(e);
              onChange?.(e.target.value);
            }}
            slotProps={type === 'date' ? { inputLabel: { shrink: true }, htmlInput: { max } } : undefined}>
            {isUnknown && <MenuItem value={field.value} disabled>{field.value}</MenuItem>}
            {options?.map((o) => (
              <MenuItem key={o.value} value={o.value}>{translateLabels ? translate(o.label) : o.label}</MenuItem>
            ))}
          </TextField>
        );
      }} />
  );
}
