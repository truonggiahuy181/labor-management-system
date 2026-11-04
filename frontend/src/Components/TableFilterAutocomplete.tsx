'use client';

import { Autocomplete, createFilterOptions, TextField } from '@mui/material';
import useLocales from '@/Hooks/useLocales';

export interface TableFilterOption {
  value: string;
  label: string;
}

const filterOptions = createFilterOptions<TableFilterOption>({
  stringify: (option) => `${option.label} ${option.value}`,
});

export default function TableFilterAutocomplete({ value, options, ariaLabel, onChange }: {
  value: string;
  options: TableFilterOption[];
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  const { translate } = useLocales();
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Autocomplete
      fullWidth
      size="small"
      options={options}
      value={selectedOption}
      autoHighlight
      openOnFocus
      selectOnFocus
      clearOnEscape
      filterOptions={filterOptions}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.value === selected.value}
      noOptionsText={translate('users.noData')}
      onChange={(_, option) => onChange(option?.value ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, 'aria-label': ariaLabel },
          }}
        />
      )}
    />
  );
}
