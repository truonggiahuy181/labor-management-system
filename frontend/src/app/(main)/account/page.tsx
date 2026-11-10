// src/app/(main)/account/page.tsx  →  /account  (Thông tin tài khoản)
"use client";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, Stack, TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import { FilesTable } from "@/Components/BusinessRegister/BusinessInfoStep";
import ChangeEmailDialog from "@/Components/ChangeEmailDialog";
import AvatarCard from "@/Components/UserProfile/AvatarCard";
import FormTextField from "@/Components/UserProfile/FormTextField";
import ProfileHeader from "@/Components/UserProfile/ProfileHeader";
import ProfileLayout from "@/Components/UserProfile/ProfileLayout";
import ProfileSections from "@/Components/UserProfile/ProfileSections";
import useLocales from "@/Hooks/useLocales";
import useLocations from "@/Hooks/useLocations";
import type { BusinessFiles } from "@/services/business";
import { enterpriseApi, toBusinessFiles } from "@/services/enterprise";
import {
  getErrorMessage,
  userApi,
  type Profile,
  type ProfileUpdate,
} from "@/services/user";
import { GENDERS } from "@/Components/UserProfile/options";
import { getRoleKey, hasRole, ROLE_LABEL } from "@/constants/roles";
import useAuth from "@/Hooks/useAuth";
import { getLocalToday, isNotFutureDate } from "@/services/date";
import { notBlank } from "@/services/text";
type Form = Required<{ [K in keyof ProfileUpdate]: string }>;

const EMPTY: Form = {
  fullName: "",
  dob: "",
  gender: "",
  phoneNumber: "",
  title: "",
  provinceId: "",
  wardId: "",
  address: "",
};

const toForm = (p: Profile): Form => ({
  fullName: p.fullName ?? "",
  dob: p.dob?.slice(0, 10) ?? "",
  gender: p.gender === null ? "" : String(p.gender),
  phoneNumber: p.phoneNumber ?? "",
  title: p.title ?? "",
  provinceId: p.provinceId ?? "",
  wardId: p.wardId ?? "",
  address: p.address ?? "",
});

// Form dùng chuỗi rỗng cho ô trống; gửi lên thì bỏ khoảng trắng đầu / cuối, bỏ ô trống (kể cả chỉ có dấu cách)
// và đổi gender về số
const toUpdate = (f: Form): ProfileUpdate => {
  const body: ProfileUpdate = {};
  for (const [k, v] of Object.entries(f))
    if (v.trim() !== "") Object.assign(body, { [k]: v.trim() });
  if (f.gender !== "") body.gender = Number(f.gender);
  return body;
};

export default function AccountPage() {
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [enterpriseFiles, setEnterpriseFiles] = useState<BusinessFiles | null>(
    null,
  );
  // Vai trò lấy từ phiên đăng nhập (có roleCode); /users/me chỉ trả roleId
  const isEnterprise = !!profile && hasRole(user, "ENTERPRISE");
  const roleKey = getRoleKey(user);
  const locations = useLocations();
  const { ensureWards } = locations;
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<Form>({ defaultValues: EMPTY });

  const selectedProvince = useWatch({ control, name: "provinceId" });
  const currentWards = locations.wardsOf(selectedProvince);

  useEffect(() => {
    void ensureWards(selectedProvince);
  }, [ensureWards, selectedProvince]);

  useEffect(() => {
    userApi
      .getMe()
      .then((p) => {
        setProfile(p);
        reset(toForm(p));
      })
      .catch((err) =>
        enqueueSnackbar(getErrorMessage(err, translate("account.loadFailed")), {
          variant: "error",
        }),
      );
  }, [reset, enqueueSnackbar, translate]);

  // Tài khoản doanh nghiệp: xem file đính kèm của doanh nghiệp (GET /enterprises/me), chỉ đọc
  useEffect(() => {
    if (!isEnterprise) return;
    enterpriseApi
      .me()
      .then((e) => setEnterpriseFiles(toBusinessFiles(e)))
      .catch((err) =>
        enqueueSnackbar(
          getErrorMessage(err, translate("account.enterpriseLoadFailed")),
          { variant: "error" },
        ),
      );
  }, [isEnterprise, enqueueSnackbar, translate]);

  const onSubmit = async (values: Form) => {
    try {
      const p = await userApi.updateMe(toUpdate(values));
      setProfile((old) => (old ? { ...old, ...p } : p));
      reset(toForm({ ...profile!, ...p }));
      enqueueSnackbar(translate("common.saveSuccess"), { variant: "success" });
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err, translate("common.unknownError")), {
        variant: "error",
      });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      const updatedProfile = await userApi.uploadAvatar(file);
      setProfile(updatedProfile);
      enqueueSnackbar(translate("account.avatarUploadSuccess"), {
        variant: "success",
      });
    } catch (err) {
      enqueueSnackbar(
        getErrorMessage(err, translate("account.avatarUploadFailed")),
        { variant: "error" },
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const roleName = profile
    ? roleKey
      ? translate(ROLE_LABEL[roleKey])
      : translate("account.roleUnknown", { id: profile.roleId })
    : "";
  const maxLength = (value: number) => ({
    value,
    message: translate("common.maxLength", { max: value }),
  });

  const personal = [
    <TextField
      key="username"
      fullWidth
      size="small"
      label={translate("account.username")}
      value={profile?.username ?? ""}
      disabled
      required
    />,
    <FormTextField
      key="fullName"
      control={control}
      name="fullName"
      label="account.fullName"
      rules={{
        required: translate("common.required"),
        validate: (value) => notBlank(value) || translate("common.required"),
        maxLength: maxLength(100),
      }}
    />,
    <FormTextField
      key="dob"
      control={control}
      name="dob"
      label="account.dob"
      type="date"
      max={getLocalToday()}
      rules={{
        validate: (value) =>
          isNotFutureDate(value) || translate("account.dobFuture"),
      }}
    />,
    <FormTextField
      key="gender"
      control={control}
      name="gender"
      label="account.gender"
      options={GENDERS}
    />,
    <FormTextField
      key="title"
      control={control}
      name="title"
      label="account.title"
      rules={{ maxLength: maxLength(100) }}
    />,
    <TextField
      key="role"
      fullWidth
      size="small"
      label={translate("account.role")}
      required
      disabled
      value={roleName}
    />,
    <Stack
      key="email"
      direction="row"
      spacing={2}
      sx={{ alignItems: "center" }}
    >
      <TextField
        fullWidth
        size="small"
        label={translate("account.email")}
        value={profile?.email ?? ""}
        disabled
      />
      <Link
        component="button"
        type="button"
        onClick={() => setEmailOpen(true)}
        sx={{ whiteSpace: "nowrap" }}
      >
        {translate("account.change")}
      </Link>
    </Stack>,
  ];

  // Dùng chung khung với trang Chi tiết người dùng (Components/UserProfile)
  return (
    <ProfileLayout
      onSubmit={handleSubmit(onSubmit)}
      header={
        <ProfileHeader
          onCancel={() => profile && reset(toForm(profile))}
          cancelDisabled={!isDirty}
          saveDisabled={!isDirty || isSubmitting || isUploadingAvatar}
        />
      }
      left={
        <AvatarCard
          avatarUrl={profile?.avatarUrl}
          active={profile?.isActive ?? false}
          onAvatarUpload={handleAvatarUpload}
          isUploadingAvatar={isUploadingAvatar || isSubmitting}
        />
      }
      right={
        <ProfileSections
          personal={personal}
          province={
            <FormTextField
              control={control}
              name="provinceId"
              label="account.province"
              options={locations.provinceOptions}
              searchable
              disabled={locations.loadingProvinces}
              translateLabels={false}
              onChange={() => setValue("wardId", "", { shouldDirty: true })}
            />
          }
          ward={
            <FormTextField
              control={control}
              name="wardId"
              label="account.ward"
              options={currentWards}
              searchable
              disabled={
                !selectedProvince ||
                locations.isLoadingWards(selectedProvince) ||
                currentWards.length === 0
              }
              translateLabels={false}
            />
          }
          address={
            <FormTextField
              control={control}
              name="address"
              label="account.address"
              rules={{ maxLength: maxLength(255) }}
            />
          }
          files={
            isEnterprise &&
            enterpriseFiles && <FilesTable files={enterpriseFiles} />
          }
        />
      }
    >
      <ChangeEmailDialog
        open={emailOpen}
        currentEmail={profile?.email ?? ""}
        onClose={() => setEmailOpen(false)}
        onChanged={(email) => setProfile((p) => (p ? { ...p, email } : p))}
      />
    </ProfileLayout>
  );
}
