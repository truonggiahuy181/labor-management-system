"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import type { InjuryType } from "@/services/accidentCatalog";

interface InjuryTypeParentTreeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: InjuryType[];
  label: string;
  noParentLabel: string;
  helperText: string;
  expandLabel: string;
  collapseLabel: string;
  disabled?: boolean;
}

const sortByCode = (left: InjuryType, right: InjuryType) =>
  left.injuryTypeCode.localeCompare(right.injuryTypeCode, "vi", {
    numeric: true,
  });

export default function InjuryTypeParentTreeSelect({
  value,
  onChange,
  options,
  label,
  noParentLabel,
  helperText,
  expandLabel,
  collapseLabel,
  disabled = false,
}: InjuryTypeParentTreeSelectProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );
  const childrenByParent = useMemo(() => {
    const groups = new Map<number | null, InjuryType[]>();
    options.forEach((option) => {
      const group = groups.get(option.parentId) ?? [];
      group.push(option);
      groups.set(option.parentId, group);
    });
    groups.forEach((group) => group.sort(sortByCode));
    return groups;
  }, [options]);

  const selected = value ? optionsById.get(Number(value)) : undefined;
  const selectedLabel = selected
    ? `${selected.injuryTypeCode} - ${selected.injuryTypeName}`
    : noParentLabel;

  const close = () => setAnchorElement(null);
  const open = (element: HTMLElement) => {
    if (disabled) return;
    setExpandedIds((existing) => {
      const next = new Set(existing);
      let current = value ? optionsById.get(Number(value)) : undefined;
      while (current?.parentId) {
        next.add(current.parentId);
        current = optionsById.get(current.parentId);
      }
      return next;
    });
    setAnchorElement(element);
  };
  const select = (nextValue: string) => {
    onChange(nextValue);
    close();
  };
  const toggle = (id: number) => {
    setExpandedIds((existing) => {
      const next = new Set(existing);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNodes = (parentId: number | null, depth = 0) =>
    (childrenByParent.get(parentId) ?? []).map((option) => {
      const children = childrenByParent.get(option.id) ?? [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedIds.has(option.id);

      return (
        <Fragment key={option.id}>
          <Box sx={{ display: "flex", alignItems: "stretch", pl: depth * 2 }}>
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={() => toggle(option.id)}
                aria-label={isExpanded ? collapseLabel : expandLabel}
                aria-expanded={isExpanded}
                sx={{ alignSelf: "center", mx: 0.25 }}
              >
                {isExpanded ? (
                  <KeyboardArrowDownIcon />
                ) : (
                  <KeyboardArrowRightIcon />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 38, flexShrink: 0 }} />
            )}
            <ListItemButton
              selected={value === String(option.id)}
              onClick={() => select(String(option.id))}
              role="treeitem"
              aria-level={option.level}
              sx={{ minWidth: 0, py: 0.5 }}
            >
              <ListItemText
                primary={`${option.injuryTypeCode} - ${option.injuryTypeName}`}
                slotProps={{
                  primary: { noWrap: true, title: option.injuryTypeName },
                }}
              />
            </ListItemButton>
          </Box>
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List disablePadding role="group">
                {renderNodes(option.id, depth + 1)}
              </List>
            </Collapse>
          )}
        </Fragment>
      );
    });

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={selectedLabel}
        helperText={helperText}
        disabled={disabled}
        onClick={(event) => open(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open(event.currentTarget);
          }
        }}
        slotProps={{
          htmlInput: {
            readOnly: true,
            "aria-haspopup": "tree",
            "aria-expanded": Boolean(anchorElement),
          },
        }}
        sx={{
          "& .MuiInputBase-root": { cursor: disabled ? "default" : "pointer" },
        }}
      />
      <Popover
        open={Boolean(anchorElement)}
        anchorEl={anchorElement}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: anchorElement?.clientWidth,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: 360,
            },
          },
        }}
      >
        <List dense role="tree" aria-label={label} sx={{ py: 0.5 }}>
          <ListItemButton selected={!value} onClick={() => select("")}>
            <ListItemText primary={noParentLabel} />
          </ListItemButton>
          {renderNodes(null)}
        </List>
      </Popover>
    </>
  );
}
