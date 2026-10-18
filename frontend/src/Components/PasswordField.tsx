// src/components/PasswordField.tsx
'use client';
import { forwardRef, useState } from 'react';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const PasswordField = forwardRef<HTMLDivElement, TextFieldProps>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);

  return (
    <TextField
      {...props}
      ref={ref}
      type={show ? 'text' : 'password'}
      // MUI v6+ dùng slotProps.input thay cho InputProps (InputProps đã bị bỏ)
      slotProps={{
        ...props.slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" tabIndex={-1} onClick={() => setShow((s) => !s)}>
                {show ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
});

export default PasswordField;