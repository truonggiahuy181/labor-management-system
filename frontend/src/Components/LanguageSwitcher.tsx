// src/components/LanguageSwitcher.tsx
'use client';
import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import useLocales from '@/Hooks/useLocales';

export default function LanguageSwitcher() {
  const { allLang, currentLang, onChangeLang } = useLocales();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button size="small" variant="outlined" onClick={(e) => setAnchorEl(e.currentTarget)}>
        {currentLang.short}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {allLang.map((lang) => (
          <MenuItem
            key={lang.value}
            selected={lang.value === currentLang.value}
            onClick={() => { onChangeLang(lang.value); setAnchorEl(null); }}
          >
            {lang.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}