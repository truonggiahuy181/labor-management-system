// src/Components/BusinessRegister/BusinessInfoStep.tsx
// Bước 1 – Thông tin doanh nghiệp: thông tin DN (bắt buộc), thông tin liên hệ, file đính kèm.
"use client";
import { useEffect, useRef } from "react";
import {
  Controller,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";
import {
  Autocomplete,
  Box,
  createFilterOptions,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { useSnackbar } from "notistack";
import useLocales from "@/Hooks/useLocales";
import type { LocationCatalog } from "@/Hooks/useLocations";
import { getErrorCode } from "@/services/auth";
import {
  ensureUploadedPublicDocument,
  type BusinessFiles,
  type BusinessFileValue,
  type BusinessInfo,
} from "@/services/business";
import {
  getLocalToday,
  isBusinessLicenseDateNotTooEarly,
  isNotFutureDate,
  MIN_BUSINESS_LICENSE_DATE,
} from "@/services/date";
import { fileAccessUrl } from "@/services/enterprise";
import { notBlank, stripSpaces } from "@/services/text";
import { type CatalogOptions, type Option } from "./options";
import IndustryTreeSelect from "./IndustryTreeSelect";
import AppDateField from "@/Components/AppDateField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9}$/;
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
// Khớp backend file.constants.ts: đăng ký công khai (thư mục documents) chỉ nhận tài liệu,
// admin tải lên enterprise-files nhận cả ảnh lẫn tài liệu
export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx";
export const ENTERPRISE_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx";
// Backend MAX_DOCUMENT_FILE_SIZE, áp dụng cho cả documents và enterprise-files
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type FieldDef = {
  name: keyof BusinessInfo;
  label: string;
  required?: boolean;
  disabled?: boolean;
  rules?: RegisterOptions<BusinessInfo, keyof BusinessInfo>;
  validate?: Record<string, (value: string) => true | string>; // gộp chung với kiểm tra ô bắt buộc
  options?: Option[];
  searchable?: boolean;
  type?: "date";
  maxLength?: number;
  span?: 1 | 2 | 3; // số cột chiếm trên lưới 3 cột
  noSpaces?: boolean; // MST / email / SĐT: rời ô thì bỏ hết khoảng trắng
};

const filterOptions = createFilterOptions<Option>({
  stringify: (option) => `${option.label} ${option.value}`,
  limit: 100,
});

type Props = {
  form: UseFormReturn<BusinessInfo>;
  files: BusinessFiles;
  onFilesChange: (files: BusinessFiles) => void;
  catalog: CatalogOptions;
  locations: LocationCatalog;
  isEdit?: boolean; // cập nhật: đổi tiêu đề, khoá mã số thuế (= tên đăng nhập)
  lockEmail?: boolean; // doanh nghiệp tự cập nhật: email chỉ đổi qua OTP ở trang Thông tin tài khoản
  accept?: string; // đuôi file cho phép, mặc định theo luồng đăng ký công khai
};

export default function BusinessInfoStep({
  form,
  files,
  onFilesChange,
  catalog,
  locations,
  isEdit = false,
  lockEmail = false,
  accept = DOCUMENT_ACCEPT,
}: Props) {
  const { translate } = useLocales();
  const { control, watch, setValue } = form;
  const t = (key: string) => translate(`businessRegister.${key}`);
  const pattern = (value: RegExp, key: string) => ({ value, message: t(key) });

  const province = watch("province");
  const operatingProvince = watch("operatingProvince");
  const { ensureWards } = locations;
  const wards = locations.wardsOf(province);
  const operatingWards = locations.wardsOf(operatingProvince);

  useEffect(() => {
    void ensureWards(province);
  }, [ensureWards, province]);

  useEffect(() => {
    void ensureWards(operatingProvince);
  }, [ensureWards, operatingProvince]);

  const companyFields: FieldDef[] = [
    {
      name: "companyName",
      label: t("companyName"),
      required: true,
      maxLength: 255,
    },
    {
      name: "taxCode",
      label: t("taxCode"),
      required: true,
      disabled: isEdit,
      noSpaces: true,
      maxLength: 14,
      rules: { pattern: pattern(TAX_CODE_RE, "invalidTaxCode") },
    },
    {
      name: "businessType",
      label: t("businessType"),
      required: true,
      options: catalog.businessTypes,
      searchable: true,
    },
    {
      name: "mainIndustry",
      label: t("mainIndustry"),
      required: true,
      options: catalog.industries,
      searchable: true,
    },
    {
      name: "licenseDate",
      label: t("licenseDate"),
      required: true,
      type: "date",
      validate: {
        notTooEarly: (v) =>
          isBusinessLicenseDateNotTooEarly(v) || t("licenseDateTooEarly"),
        notFuture: (v) => isNotFutureDate(v) || t("licenseDateFuture"),
      },
    },
    // Cố định Thành phố Hồ Chí Minh (EMPTY_BUSINESS_INFO.province), chỉ chọn Phường/Xã
    {
      name: "province",
      label: t("province"),
      required: true,
      disabled: true,
      options: locations.provinceOptions,
      searchable: true,
    },
    {
      name: "ward",
      label: t("ward"),
      required: true,
      options: wards,
      searchable: true,
    },
    {
      name: "address",
      label: t("address"),
      required: true,
      maxLength: 255,
      span: 2,
    },
  ];

  // Bố cục theo thiết kế: tên NN / email / SĐT – tỉnh / xã hoạt động – địa điểm / người đứng đầu / SĐT
  const contactFields: (FieldDef | null)[] = [
    { name: "foreignName", label: t("foreignName"), maxLength: 255 },
    {
      name: "email",
      label: t("email"),
      required: true,
      disabled: lockEmail,
      noSpaces: true,
      maxLength: 100,
      rules: { pattern: pattern(EMAIL_RE, "invalidEmail") },
    },
    {
      name: "officePhone",
      label: t("officePhone"),
      required: !isEdit,
      noSpaces: true,
      maxLength: 10,
      rules: { pattern: pattern(PHONE_RE, "invalidPhone") },
    },
    {
      name: "operatingProvince",
      label: t("operatingProvince"),
      required: !isEdit,
      options: locations.provinceOptions,
      searchable: true,
    },
    {
      name: "operatingWard",
      label: t("operatingWard"),
      required: !isEdit,
      options: operatingWards,
      searchable: true,
    },
    null,
    { name: "businessLocation", label: t("businessLocation"), maxLength: 255 },
    { name: "leaderName", label: t("leaderName"), maxLength: 100 },
    {
      name: "leaderPhone",
      label: t("leaderPhone"),
      noSpaces: true,
      maxLength: 10,
      rules: { pattern: pattern(PHONE_RE, "invalidPhone") },
    },
  ];

  const renderField = (def: FieldDef | null, index: number) =>
    def ? (
      <Box
        key={def.name}
        sx={{ gridColumn: { xs: "span 1", md: `span ${def.span ?? 1}` } }}
      >
        <Controller
          name={def.name}
          control={control}
          rules={{
            ...def.rules,
            required: def.required ? translate("common.required") : false,
            ...(def.maxLength && {
              maxLength: {
                value: def.maxLength,
                message: translate("common.maxLength", { max: def.maxLength }),
              },
            }),
            validate: {
              ...def.validate,
              // Ô chữ bắt buộc: chỉ gõ dấu cách cũng tính là bỏ trống
              ...(def.required &&
                !def.options && {
                  notBlank: (v: string) =>
                    notBlank(v) || translate("common.required"),
                }),
            },
          }}
          render={({ field, fieldState }) => {
            const disabled =
              def.disabled || (!!def.options && def.options.length === 0);
            const selectValue = (value: string) => {
              field.onChange(value);
              // Đổi tỉnh → xoá phường/xã đã chọn
              if (def.name === "province") setValue("ward", "");
              if (def.name === "operatingProvince")
                setValue("operatingWard", "");
            };

            if (def.name === "mainIndustry" && catalog.industryTree?.length) {
              return (
                <IndustryTreeSelect
                  value={field.value}
                  onChange={selectValue}
                  onBlur={field.onBlur}
                  industries={catalog.industryTree}
                  label={def.label}
                  required={def.required}
                  disabled={disabled}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  inputRef={field.ref}
                  name={field.name}
                />
              );
            }

            if (def.options) {
              const unknownOption =
                field.value &&
                !def.options.some((option) => option.value === field.value)
                  ? { value: field.value, label: field.value }
                  : null;
              const availableOptions = unknownOption
                ? [unknownOption, ...def.options]
                : def.options;
              const selectedOption =
                availableOptions.find(
                  (option) => option.value === field.value,
                ) ?? null;

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
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                  onBlur={field.onBlur}
                  onChange={(_, option) => selectValue(option?.value ?? "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      inputRef={field.ref}
                      name={field.name}
                      label={def.label}
                      required={def.required}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              );
            }

            if (def.type === "date") {
              return (
                <AppDateField
                  value={field.value}
                  onChange={selectValue}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  name={field.name}
                  label={def.label}
                  required={def.required}
                  disabled={disabled}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  min={MIN_BUSINESS_LICENSE_DATE}
                  max={getLocalToday()}
                />
              );
            }

            const slotProps = def.maxLength
              ? { htmlInput: { maxLength: def.maxLength } }
              : undefined;

            return (
              <TextField
                {...field}
                fullWidth
                size="small"
                label={def.label}
                required={def.required}
                type={def.type}
                disabled={disabled}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onChange={(e) => selectValue(e.target.value)}
                // Vẫn cho gõ dấu cách; rời ô thì mới bỏ hết khoảng trắng, rồi mới kiểm tra lỗi
                onBlur={() => {
                  if (def.noSpaces && field.value !== stripSpaces(field.value))
                    field.onChange(stripSpaces(field.value));
                  field.onBlur();
                }}
                slotProps={slotProps}
              />
            );
          }}
        />
      </Box>
    ) : (
      <Box
        key={`empty-${index}`}
        sx={{ display: { xs: "none", md: "block" } }}
      />
    );

  const grid = {
    display: "grid",
    gap: 2,
    gridTemplateColumns: {
      xs: "minmax(0, 1fr)",
      md: "repeat(3, minmax(0, 1fr))",
    },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Section
        title={translate(
          isEdit
            ? "enterprises.updateSection"
            : "businessRegister.companySection",
        )}
      >
        <Box sx={grid}>{companyFields.map(renderField)}</Box>
      </Section>

      <Section title={t("contactSection")}>
        <Box sx={grid}>{contactFields.map(renderField)}</Box>
      </Section>

      <Section
        title={t("filesSection")}
        hint={t(
          accept === DOCUMENT_ACCEPT
            ? "filesHintDocument"
            : "filesHintEnterprise",
        )}
      >
        <FilesTable files={files} onChange={onFilesChange} accept={accept} />
      </Section>
    </Box>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          flexWrap: "wrap",
          columnGap: 1,
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  );
}

/** Bảng file đính kèm: xem / tải lên / xoá cho từng loại giấy tờ */
export function FilesTable({
  files,
  onChange,
  accept = DOCUMENT_ACCEPT,
}: {
  files: BusinessFiles;
  onChange?: (f: BusinessFiles) => void;
  accept?: string;
}) {
  const { translate, translateError } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const { enqueueSnackbar } = useSnackbar();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const rows: { key: keyof BusinessFiles; label: string }[] = [
    { key: "businessLicense", label: t("businessLicense") },
    { key: "otherDocument", label: t("otherDocument") },
  ];

  const fileName = (file: BusinessFileValue) =>
    file instanceof File ? file.name : (file?.originalName ?? "");

  const view = async (file: BusinessFileValue) => {
    if (!file) return;
    if (file instanceof File) {
      // File PDF và ảnh: trình duyệt mở trực tiếp bằng blob URL; Word/Excel: tải lên R2 để trình duyệt mở qua URL https giống trang Admin
      if (
        file.type === "application/pdf" ||
        file.type.startsWith("image/") ||
        /\.(pdf|jpe?g|png|gif|webp)$/i.test(file.name)
      ) {
        const url = URL.createObjectURL(file);
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      const tab = window.open("", "_blank");
      if (tab) tab.opener = null;
      try {
        const uploaded = await ensureUploadedPublicDocument(file);
        const url = uploaded.accessUrl || (await fileAccessUrl(uploaded));
        if (tab) tab.location.href = url;
      } catch (err) {
        tab?.close();
        enqueueSnackbar(translateError(getErrorCode(err)), {
          variant: "error",
        });
      }
      return;
    }
    if (file.accessUrl) {
      window.open(file.accessUrl, "_blank", "noopener,noreferrer");
      return;
    }
    // File đăng ký phải lấy URL qua API: mở tab ngay trong lúc click (tránh bị chặn popup) rồi mới gán URL
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = await fileAccessUrl(file);
      if (tab) tab.location.href = url;
    } catch (err) {
      tab?.close();
      enqueueSnackbar(translateError(getErrorCode(err)), { variant: "error" });
    }
  };

  return (
    <Table size="small">
      <TableHead sx={{ bgcolor: "grey.100" }}>
        <TableRow>
          <TableCell>{t("fileName")}</TableCell>
          <TableCell>{t("fileInfo")}</TableCell>
          <TableCell align="right">{t("actions")}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(({ key, label }) => (
          <TableRow key={key}>
            <TableCell>{label}</TableCell>
            <TableCell>{fileName(files[key])}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
              <Tooltip title={t("view")}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!files[key]}
                    onClick={() => view(files[key])}
                  >
                    <VisibilityOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              {onChange && (
                <>
                  <Tooltip title={t("upload")}>
                    <IconButton
                      size="small"
                      onClick={() => inputs.current[key]?.click()}
                    >
                      <FileUploadOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("remove")}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={!files[key]}
                        onClick={() => onChange({ ...files, [key]: null })}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <input
                    hidden
                    type="file"
                    accept={accept}
                    ref={(el) => {
                      inputs.current[key] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      e.target.value = ""; // chọn lại cùng file vẫn kích hoạt onChange
                      // Chặn ngay khi chọn, không đợi tới lúc gửi hồ sơ mới bị backend từ chối
                      if (file && file.size > MAX_FILE_SIZE) {
                        enqueueSnackbar(translateError("FILE_TOO_LARGE"), {
                          variant: "error",
                        });
                        return;
                      }
                      onChange({ ...files, [key]: file });
                    }}
                  />
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
