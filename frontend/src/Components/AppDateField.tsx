"use client";

import { useRef, useState } from "react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import {
  IconButton,
  InputAdornment,
  TextField,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  formatDateInput,
  formatDisplayDate,
  parseDisplayDate,
} from "@/services/date";

interface AppDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  ariaLabel?: string;
  name?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  fullWidth?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

export default function AppDateField({
  value,
  onChange,
  onBlur,
  label,
  ariaLabel,
  name,
  inputRef,
  min,
  max,
  required,
  disabled,
  error = false,
  helperText,
  fullWidth = true,
  size = "small",
  sx,
}: AppDateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const displayValue = draftValue ?? formatDisplayDate(value);

  const parsedValue = parseDisplayDate(displayValue);
  const invalidFormat = touched && Boolean(displayValue) && !parsedValue;
  const beforeMin = Boolean(parsedValue && min && parsedValue < min);
  const afterMax = Boolean(parsedValue && max && parsedValue > max);
  const internalError = invalidFormat || beforeMin || afterMax;
  const internalHelper = invalidFormat
    ? "Ngày không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy."
    : beforeMin
      ? `Ngày không được trước ${formatDisplayDate(min)}.`
      : afterMax
        ? `Ngày không được sau ${formatDisplayDate(max)}.`
        : undefined;

  const openPicker = () => {
    if (disabled) return;
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  };

  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      label={label}
      name={name}
      inputRef={inputRef}
      value={displayValue}
      required={required}
      disabled={disabled}
      error={error || internalError}
      helperText={internalHelper ?? helperText}
      placeholder="dd/mm/yyyy"
      onChange={(event) => {
        const nextDisplay = formatDateInput(event.target.value);
        setDraftValue(nextDisplay);
        if (!nextDisplay) onChange("");
        else {
          const nextIso = parseDisplayDate(nextDisplay);
          if (nextIso) onChange(nextIso);
        }
      }}
      onBlur={() => {
        setTouched(true);
        if (!displayValue || parsedValue) setDraftValue(null);
        onBlur?.();
      }}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                disabled={disabled}
                aria-label={ariaLabel ?? label ?? "Chọn ngày"}
                onClick={openPicker}
              >
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
              <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={value || ""}
                min={min}
                max={max}
                onChange={(event) => {
                  setTouched(true);
                  setDraftValue(null);
                  onChange(event.target.value);
                }}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
            </InputAdornment>
          ),
        },
        htmlInput: {
          "aria-label": ariaLabel,
          inputMode: "numeric",
          maxLength: 10,
        },
      }}
      sx={sx}
    />
  );
}
