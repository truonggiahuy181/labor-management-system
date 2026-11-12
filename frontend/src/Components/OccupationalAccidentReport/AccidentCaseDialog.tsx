"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { OccupationalAccidentCase } from "@/services/occupationalAccidentReport";
import AccidentCaseForm, {
  type AccidentCaseFormProps,
} from "./AccidentCaseForm";
import { toAccidentCaseBody } from "./accidentCaseValidation";

interface AccidentCaseDialogProps extends Omit<
  AccidentCaseFormProps,
  "value" | "onChange" | "onCancel" | "showSaveAndNext"
> {
  open: boolean;
  item: OccupationalAccidentCase | null;
  onClose: () => void;
}

export default function AccidentCaseDialog({
  open,
  item,
  onClose,
  ...props
}: AccidentCaseDialogProps) {
  const [form, setForm] = useState(() => toAccidentCaseBody(item));
  return (
    <Dialog
      open={open}
      onClose={props.saving ? undefined : onClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        <Typography component="span" sx={{ flex: 1, fontWeight: 700 }}>
          {item ? "Cập nhật vụ tai nạn" : "Thêm vụ tai nạn"}
        </Typography>
        <IconButton onClick={onClose} disabled={props.saving} aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <AccidentCaseForm
          {...props}
          value={form}
          onChange={setForm}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
