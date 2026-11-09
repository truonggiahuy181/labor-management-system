// src/Components/BusinessRegister/BusinessRegisterForm.tsx
// Luồng đăng ký tài khoản doanh nghiệp (trang /register, mở từ nút trên trang Đăng nhập):
//   1. Thông tin doanh nghiệp → "Tiếp tục" gửi OTP về email
//   2. Hộp thoại Xác thực email → nhập OTP đúng thì sang bước xác nhận
//   3. Xác nhận đăng ký → "Xác nhận" tạo tài khoản; dùng được ngay, tên đăng nhập = mã số thuế
// Quản trị viên thêm / cập nhật doanh nghiệp ở trang riêng (Components/EnterpriseManagement/EnterpriseForm)
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Alert, Box, Button, LinearProgress, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Check from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import useCatalogs from '@/Hooks/useCatalogs';
import { getErrorCode } from '@/services/auth';
import { businessApi, RegisteredAccount, type BusinessFiles, type BusinessInfo } from '@/services/business';
import { EMPTY_BUSINESS_FILES, EMPTY_BUSINESS_INFO } from './options';
import BusinessInfoStep from './BusinessInfoStep';
import ConfirmStep from './ConfirmStep';
import EmailOtpDialog from './EmailOtpDialog';
import AccountInfoDialog from './AccountInfoDialog';

const LOGIN_PATH = '/login';

export default function BusinessRegisterForm() {
  const { translate, translateError } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  // Danh mục thật từ API: backend nhận businessTypeId / industryId dạng số
  const { catalog, locations, loading: catalogLoading, loadError: catalogLoadError, retry: retryCatalogs } = useCatalogs();

  const form = useForm<BusinessInfo>({ defaultValues: EMPTY_BUSINESS_INFO, mode: 'onTouched' });
  const [files, setFiles] = useState<BusinessFiles>(EMPTY_BUSINESS_FILES);
  const [step, setStep] = useState<0 | 1>(0);
  const [otpOpen, setOtpOpen] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<RegisteredAccount | null>(null);

  const reset = () => {
    form.reset(EMPTY_BUSINESS_INFO);
    setFiles(EMPTY_BUSINESS_FILES);
    setStep(0);
    setVerifyToken('');
    setError('');
  };

  // cacheComponents giữ trang đã rời (ẩn đi chứ không huỷ) → rời trang thì đưa form về bước 1, trống
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => reset(), []);

  // Đang nhập dở mà reload / đóng tab thì trình duyệt hỏi lại, tránh mất dữ liệu
  const dirty = form.formState.isDirty || !!files.businessLicense || !!files.otherDocument;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const goStep = (next: 0 | 1) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  // Alert nằm đầu trang, nút "Tiếp tục" ở cuối → cuộn lên để người dùng thấy lỗi
  const showError = (message: string) => {
    setError(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trùng MST / email (409 từ backend): báo ngay dưới ô tương ứng và focus vào ô đó
  const FIELD_OF_ERROR: Record<string, 'taxCode' | 'email'> = { TAX_CODE_EXISTS: 'taxCode', EMAIL_EXISTS: 'email' };
  const showSendOtpError = (code?: string) => {
    const field = code ? FIELD_OF_ERROR[code] : undefined;
    if (!field) return showError(translateError(code));
    setError('');
    form.setError(field, { message: translateError(code) }, { shouldFocus: true });
  };

  // Bước 1 → gửi OTP. Bắt buộc có Giấy phép kinh doanh.
  const goNext = form.handleSubmit(
    async ({ email, taxCode }) => {
      if (!files.businessLicense) return showError(t('licenseRequired'));
      setError('');
      setBusy(true);
      try {
        const res = await businessApi.sendOtp({ email, taxCode });
        if (!res.success) return showSendOtpError(res.code);
        setOtpOpen(true);
      } catch (err) {
        showSendOtpError(getErrorCode(err));
      } finally {
        setBusy(false);
      }
    },
    () => showError(translate('common.missingInfo')),
  );

  const onVerified = (token: string) => {
    setVerifyToken(token);
    setOtpOpen(false);
    goStep(1);
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await businessApi.register({ ...form.getValues(), ...files, verifyToken });
      if (!res.success) return showError(translateError(res.code));
      setAccount(res.data);
      enqueueSnackbar(t('success'), { variant: 'success' });
      reset();
    } catch (err) {
      showError(translateError(getErrorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stepper activeStep={step} sx={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
        <Step><StepLabel>{t('stepInfo')}</StepLabel></Step>
        <Step><StepLabel>{t('stepConfirm')}</StepLabel></Step>
      </Stepper>

      {catalogLoading && <LinearProgress />}
      {catalogLoadError && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={retryCatalogs}>{t('retry')}</Button>}
        >
          {t('catalogLoadError')}
        </Alert>
      )}

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box>
        {step === 0
          ? <BusinessInfoStep form={form} files={files} onFilesChange={setFiles} catalog={catalog} locations={locations} />
          : <ConfirmStep info={form.getValues()} files={files} catalog={catalog} locations={locations} />}
      </Box>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {step === 0 ? (
          <>
            <Button color="inherit" component={Link} href={LOGIN_PATH}>{t('cancel')}</Button>
            <Button variant="contained" startIcon={<ChevronRight />} onClick={goNext} disabled={busy || catalogLoading || catalogLoadError}>
              {t('next')}
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => goStep(0)} disabled={busy}>{t('back')}</Button>
            <Button variant="contained" startIcon={<Check />} onClick={submit} disabled={busy}>
              {t('confirm')}
            </Button>
          </>
        )}
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {translate('signup.hasAccount')} <Link href={LOGIN_PATH}>{translate('login.title')}</Link>
      </Typography>

      {otpOpen && <EmailOtpDialog
        open
        email={form.getValues('email')}
        taxCode={form.getValues('taxCode')}
        onClose={() => setOtpOpen(false)}
        onVerified={onVerified}
      />}
      {/* Đăng ký xong: đóng hay "Đăng nhập ngay" đều về trang login; "Đăng nhập ngay" điền sẵn tên đăng nhập */}
      <AccountInfoDialog
        account={account}
        onClose={() => {
          setAccount(null);
          router.push(LOGIN_PATH);
        }}
        onLogin={(username) => {
          setAccount(null);
          router.push(`${LOGIN_PATH}?username=${encodeURIComponent(username)}`);
        }}
      />
    </Stack>
  );
}
