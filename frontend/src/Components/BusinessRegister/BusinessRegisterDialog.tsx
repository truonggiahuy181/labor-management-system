// src/Components/BusinessRegister/BusinessRegisterDialog.tsx
// Luồng đăng ký tài khoản doanh nghiệp (mở từ nút trên trang Đăng nhập):
//   1. Thông tin doanh nghiệp → "Tiếp tục" gửi OTP về email
//   2. Hộp thoại Xác thực email → nhập OTP đúng thì sang bước xác nhận
//   3. Xác nhận đăng ký → "Xác nhận" tạo tài khoản; dùng được ngay, tên đăng nhập = mã số thuế
// Quản trị viên thêm / cập nhật doanh nghiệp ở trang riêng (Components/EnterpriseManagement/EnterpriseForm)
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Step, StepLabel, Stepper,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Check from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import useLocales from '@/Hooks/useLocales';
import useLocations from '@/Hooks/useLocations';
import { getErrorCode } from '@/services/auth';
import { businessApi, RegisteredAccount, type BusinessFiles, type BusinessInfo } from '@/services/business';
import { EMPTY_BUSINESS_FILES, EMPTY_BUSINESS_INFO } from './options';
import BusinessInfoStep from './BusinessInfoStep';
import ConfirmStep from './ConfirmStep';
import EmailOtpDialog from './EmailOtpDialog';
import AccountInfoDialog from './AccountInfoDialog';

type Props = {
  open: boolean;
  onClose: () => void;
  onRegistered?: (username: string) => void;   // ví dụ: điền sẵn tên đăng nhập ở trang login
};

export default function BusinessRegisterDialog({ open, onClose, onRegistered }: Props) {
  const { translate, translateError } = useLocales();
  const t = (key: string) => translate(`businessRegister.${key}`);
  const { enqueueSnackbar } = useSnackbar();
  const locations = useLocations();

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

  const close = () => {
    reset();
    onClose();
  };

  // Bước 1 → gửi OTP. Bắt buộc có Giấy phép kinh doanh.
  const goNext = form.handleSubmit(
    async ({ email, taxCode }) => {
      if (!files.businessLicense) return setError(t('licenseRequired'));
      setError('');
      setBusy(true);
      try {
        const res = await businessApi.sendOtp({ email, taxCode });
        if (!res.success) return setError(translateError(res.code));
        setOtpOpen(true);
      } catch (err) {
        setError(translateError(getErrorCode(err)));
      } finally {
        setBusy(false);
      }
    },
    () => setError(translate('common.missingInfo')),
  );

  const onVerified = (token: string) => {
    setVerifyToken(token);
    setOtpOpen(false);
    setStep(1);
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await businessApi.register({ ...form.getValues(), ...files, verifyToken });
      if (!res.success) return setError(translateError(res.code));
      setAccount(res.data);
      enqueueSnackbar(t('success'), { variant: 'success' });
      close();
    } catch (err) {
      setError(translateError(getErrorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={close} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>
          <Stepper activeStep={step} sx={{ maxWidth: 420, mx: 'auto' }}>
            <Step><StepLabel>{t('stepInfo')}</StepLabel></Step>
            <Step><StepLabel>{t('stepConfirm')}</StepLabel></Step>
          </Stepper>
          <IconButton onClick={close} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label={t('close')}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: 'grey.50' }}>
          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
          {step === 0
            ? <BusinessInfoStep form={form} files={files} onFilesChange={setFiles} locations={locations} />
            : <ConfirmStep info={form.getValues()} files={files} locations={locations} />}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          {step === 0 ? (
            <>
              <Button color="inherit" onClick={close}>{t('cancel')}</Button>
              <Button variant="contained" startIcon={<ChevronRight />} onClick={goNext} disabled={busy}>
                {t('next')}
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" onClick={() => setStep(0)} disabled={busy}>{t('back')}</Button>
              <Button variant="contained" startIcon={<Check />} onClick={submit} disabled={busy}>
                {t('confirm')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {otpOpen && <EmailOtpDialog
        open
        email={form.getValues('email')}
        taxCode={form.getValues('taxCode')}
        onClose={() => setOtpOpen(false)}
        onVerified={onVerified}
      />}
      <AccountInfoDialog
        account={account}
        onClose={() => setAccount(null)}
        onLogin={(username) => {
          setAccount(null);
          onRegistered?.(username);
        }}
      />
    </>
  );
}
