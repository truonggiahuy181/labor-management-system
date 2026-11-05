"use client";

import {
  Fragment,
  type ReactNode,
  type Ref,
  useMemo,
  useState,
} from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import useLocales from "@/Hooks/useLocales";
import type { Industry } from "@/services/enterprise";

interface IndustryTreeSelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  industries: Industry[];
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
}

const sortByCode = (left: Industry, right: Industry) =>
  left.industryCode.localeCompare(right.industryCode, "vi", { numeric: true });

export default function IndustryTreeSelect({
  value,
  onChange,
  onBlur,
  industries,
  label,
  required,
  disabled,
  error,
  helperText,
  inputRef,
  name,
}: IndustryTreeSelectProps) {
  const { translate } = useLocales();
  const t = (key: string, options?: Record<string, unknown>) =>
    translate(`businessRegister.${key}`, options);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const industriesById = useMemo(
    () => new Map(industries.map((industry) => [industry.id, industry])),
    [industries],
  );
  const childrenByParent = useMemo(() => {
    const groups = new Map<number | null, Industry[]>();
    industries.forEach((industry) => {
      const group = groups.get(industry.parentId) ?? [];
      group.push(industry);
      groups.set(industry.parentId, group);
    });
    groups.forEach((group) => group.sort(sortByCode));
    return groups;
  }, [industries]);

  const selected = value ? industriesById.get(Number(value)) : undefined;
  const selectedLabel = selected
    ? `${selected.industryCode} - ${selected.industryName}`
    : "";

  const open = (element: HTMLElement) => {
    if (disabled) return;
    setExpandedIds((existing) => {
      const next = new Set(existing);
      let current = selected;
      while (current?.parentId) {
        next.add(current.parentId);
        current = industriesById.get(current.parentId);
      }
      return next;
    });
    setAnchorElement(element);
  };
  const close = () => {
    setAnchorElement(null);
    onBlur();
  };
  const select = (industry: Industry) => {
    if (industry.level !== 4) return;
    onChange(String(industry.id));
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

  const renderNodes = (parentId: number | null, depth = 0): ReactNode =>
    (childrenByParent.get(parentId) ?? []).map((industry) => {
        const children = childrenByParent.get(industry.id) ?? [];
        const hasChildren = children.length > 0;
        const isSelectable = industry.level === 4;
        const isExpanded = expandedIds.has(industry.id);

        return (
          <Fragment key={industry.id}>
            <Box sx={{ display: "flex", alignItems: "stretch", pl: depth * 2 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={() => toggle(industry.id)}
                  aria-label={t(isExpanded ? "collapseIndustry" : "expandIndustry")}
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
                selected={value === String(industry.id)}
                onClick={() =>
                  isSelectable ? select(industry) : toggle(industry.id)
                }
                role="treeitem"
                aria-level={industry.level}
                aria-expanded={hasChildren ? isExpanded : undefined}
                aria-disabled={!isSelectable}
                sx={{ minWidth: 0, py: 0.5 }}
              >
                <ListItemText
                  primary={`${industry.industryCode} - ${industry.industryName}`}
                  secondary={t("industryLevel", { level: industry.level })}
                  slotProps={{
                    primary: {
                      noWrap: true,
                      title: industry.industryName,
                      sx: { fontWeight: industry.level === 1 ? 700 : 400 },
                    },
                    secondary: { component: "span" },
                  }}
                />
                {value === String(industry.id) && (
                  <CheckOutlinedIcon color="primary" fontSize="small" />
                )}
              </ListItemButton>
            </Box>
            {hasChildren && isExpanded && (
              <List disablePadding role="group">
                {renderNodes(industry.id, depth + 1)}
              </List>
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
        required={required}
        disabled={disabled}
        value={selectedLabel}
        error={error}
        helperText={helperText}
        inputRef={inputRef}
        onClick={(event) => open(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open(event.currentTarget);
          }
        }}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <ArrowDropDownIcon color={disabled ? "disabled" : "action"} />
              </InputAdornment>
            ),
          },
          htmlInput: {
            name,
            "aria-haspopup": "tree",
            "aria-expanded": Boolean(anchorElement),
          },
        }}
        sx={{ "& .MuiInputBase-root": { cursor: disabled ? "default" : "pointer" } }}
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
              width: Math.max(anchorElement?.clientWidth ?? 0, 520),
              maxWidth: "calc(100vw - 32px)",
              maxHeight: 480,
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <List dense role="tree" aria-label={label} sx={{ py: 0.5, overflowY: "auto" }}>
          {renderNodes(null)}
        </List>
      </Popover>
    </>
  );
}
