"use client";

import {
  Autocomplete,
  createFilterOptions,
  TextField,
  type SxProps,
  type Theme,
} from "@mui/material";

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const filterOptions = createFilterOptions<SearchableSelectOption>({
  stringify: (option) => `${option.label} ${option.value}`,
  limit: 100,
});

interface SearchableSelectFieldProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  ariaLabel?: string;
  name?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  placeholder?: string;
  fullWidth?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

export default function SearchableSelectField({
  value,
  options,
  onChange,
  onBlur,
  label,
  ariaLabel,
  name,
  inputRef,
  required,
  disabled,
  error,
  helperText,
  placeholder = "Nhập để tìm kiếm",
  fullWidth = true,
  size = "small",
  sx,
}: SearchableSelectFieldProps) {
  const selected = options.find((option) => option.value === value) ?? null;
  const availableOptions =
    value && !selected
      ? [{ value, label: value, disabled: true }, ...options]
      : options;

  return (
    <Autocomplete
      fullWidth={fullWidth}
      size={size}
      options={availableOptions}
      value={
        selected ??
        availableOptions.find((option) => option.value === value) ??
        null
      }
      disabled={disabled}
      autoHighlight
      openOnFocus
      selectOnFocus
      clearOnEscape
      filterOptions={filterOptions}
      getOptionLabel={(option) => option.label}
      getOptionDisabled={(option) => Boolean(option.disabled)}
      isOptionEqualToValue={(option, selectedOption) =>
        option.value === selectedOption.value
      }
      onBlur={onBlur}
      onChange={(_, option) => onChange(option?.value ?? "")}
      slotProps={{ listbox: { style: { maxHeight: 320 } } }}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          name={name}
          label={label}
          aria-label={ariaLabel}
          required={required}
          error={error}
          helperText={helperText}
          placeholder={placeholder}
        />
      )}
    />
  );
}
