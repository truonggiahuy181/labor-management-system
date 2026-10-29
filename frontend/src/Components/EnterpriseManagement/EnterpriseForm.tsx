// src/Components/EnterpriseManagement/EnterpriseForm.tsx
// Trang thêm mới / cập nhật doanh nghiệp của Quản trị viên (2 bước: Thông tin → Xác nhận):
//   enterprise = null → thêm mới (POST /enterprises), xong hiện tài khoản + mật khẩu tạm
//   enterprise có giá trị → cập nhật (PATCH /enterprises/:id)
// Dùng chung các bước với luồng Đăng ký doanh nghiệp (Components/BusinessRegister)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Alert, Box, Button, Card, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Check from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import BusinessInfoStep from '@/Components/BusinessRegister/BusinessInfoStep';
import ConfirmStep from '@/Components/BusinessRegister/ConfirmStep';
import CreatedAccountDialog from '@/Components/BusinessRegister/CreatedAccountDialog';
import { EMPTY_BUSINESS_INFO, EMPTY_BUSINESS_FILES } from '@/Components/BusinessRegister/options';
import useCatalogs from '@/Hooks/useCatalogs';
import useLocales from '@/Hooks/useLocales';
import type { BusinessFiles, BusinessInfo, RegisteredAccount } from '@/services/business';
import { enterpriseApi, toBusinessInfo, toEnterpriseBody, type Enterprise } from '@/services/enterprise';
import { getErrorMessage } from '@/services/user';
import { PROFILE_CARD_SX } from '@/Components/UserProfile/options';

export const COMPANIES_PATH = '/admin/companies';

export default function EnterpriseForm({ enterprise }: { enterprise: Enterprise | null }) {
  const { translate } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const catalogs = useCatalogs();
  const isEdit = !!enterprise;

  const form = useForm<BusinessInfo>({
    defaultValues: enterprise ? toBusinessInfo(enterprise) : EMPTY_BUSINESS_INFO,
    mode: 'onTouched',
  });
  const [files, setFiles] = useState<BusinessFiles>(EMPTY_BUSINESS_FILES);
  const [step, setStep] = useState<0 | 1>(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<RegisteredAccount | null>(null);

  // cacheComponents giữ trang đã rời (ẩn đi chứ không huỷ) → rời trang thì đưa form về bước 1, dữ liệu ban đầu
  useEffect(() => () => {
    form.reset(enterprise ? toBusinessInfo(enterprise) : EMPTY_BUSINESS_INFO);
    setFiles(EMPTY_BUSINESS_FILES);
    setStep(0);
    setError('');
  }, [enterprise, form]);

  const backToList = () => router.push(COMPANIES_PATH);

  // Backend chưa lưu file đính kèm (BACKEND_CHANGES.md) nên không bắt buộc Giấy phép kinh doanh
  const goNext = form.handleSubmit(
    () => { setError(''); setStep(1); window.scrollTo({ top: 0 }); },
    () => setError(translate('common.missingInfo')),
  );

  const submit = async () => {
    const info = form.getValues();
    setError('');
    setBusy(true);
    try {
      if (enterprise) {
        await enterpriseApi.update(enterprise.id, toEnterpriseBody(info, true));
        enqueueSnackbar(translate('enterprises.updateSuccess'), { variant: 'success' });
        backToList();
      } else {
        const { enterprise: created, initialAccess } = await enterpriseApi.create(toEnterpriseBody(info));
        enqueueSnackbar(translate('enterprises.createSuccess'), { variant: 'success' });
        // Đóng popup tài khoản thì mới quay về danh sách
        setAccount({
          username: initialAccess.username, tempPassword: initialAccess.temporaryPassword,
          companyName: created.enterpriseName, email: created.email,
        });
      }
    } catch (err) {
      setError(getErrorMessage(err, translate('common.unknownError')));
    } finally {
      setBusy(false);
    }
  };

  return (
    // Theo khung trang Chi tiết người dùng: các khung bo góc, cách sidebar và nhau 8px
    <Stack spacing={1} sx={{ m: -2 }}>
      {/* Thanh tiêu đề: tên trang – các bước – nút thao tác */}
      <Card elevation={1} sx={{ ...PROFILE_CARD_SX, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ flex: 1, fontWeight: 700, minWidth: 180 }}>
          {translate(isEdit ? 'enterprises.editTitle' : 'enterprises.createTitle')}
        </Typography>
        <Stepper activeStep={step} sx={{ flex: 1, minWidth: 320, maxWidth: 420 }}>
          <Step><StepLabel>{t('stepInfo')}</StepLabel></Step>
          <Step><StepLabel>{translate(isEdit ? 'enterprises.stepConfirmUpdate' : 'enterprises.stepConfirmCreate')}</StepLabel></Step>
        </Stepper>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {step === 0 ? (
            <>
              <Button onClick={backToList}>{t('cancel')}</Button>
              <Button variant="contained" startIcon={<ChevronRight />} onClick={goNext}>{t('next')}</Button>
            </>
          ) : (
            <>
              <Button onClick={() => setStep(0)} disabled={busy}>{t('back')}</Button>
              <Button variant="contained" startIcon={<Check />} onClick={submit} disabled={busy}>{t('confirm')}</Button>
            </>
          )}
        </Box>
      </Card>

      <Card sx={{ ...PROFILE_CARD_SX, p: 3 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {step === 0
          ? <BusinessInfoStep form={form} files={files} onFilesChange={setFiles} catalog={catalogs.catalog}
              locations={catalogs.locations} isEdit={isEdit} />
          : <ConfirmStep info={form.getValues()} files={files} catalog={catalogs.catalog} locations={catalogs.locations} />}
      </Card>

      <CreatedAccountDialog account={account} onClose={() => { setAccount(null); backToList(); }} />
    </Stack>
  );
}
