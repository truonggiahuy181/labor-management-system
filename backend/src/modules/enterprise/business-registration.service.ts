import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EnterpriseEntity } from './enterprise.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import { RedisService } from '../../commons/redis/redis.service.js';
import { MailService } from '../../commons/mail/mail.service.js';
import { ErrorCode } from '../../commons/constants/error-codes.js';
import {
  SendBusinessOtpDto,
  VerifyBusinessOtpDto,
  RegisterBusinessDto,
} from './dto/register-business.dto.js';

const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
// Thời gian sống của verifyToken (từ lúc xác thực email đến lúc bấm "Xác nhận đăng ký")
const VERIFY_TOKEN_TTL_SECONDS = 30 * 60;
const ENTERPRISE_INITIAL_PASSWORD = '1-8';
const LEVEL_FOUR_INDUSTRY_CODE_RE = /^\d{4}$/;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Chỉ nhận PDF/JPG/PNG – kiểm tra cả mimetype lẫn chữ ký đầu file (magic bytes)
const ALLOWED_FILE_TYPES: Record<string, { ext: string; magic: number[] }> = {
  'application/pdf': { ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  'image/jpeg': { ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': { ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
};

// Phần cần dùng của file do multer (memoryStorage) trả về
export interface UploadedBusinessFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface BusinessFiles {
  businessLicense?: UploadedBusinessFile[];
  otherDocument?: UploadedBusinessFile[];
}

@Injectable()
export class BusinessRegistrationService {
  private readonly logger = new Logger(BusinessRegistrationService.name);

  constructor(
    @InjectRepository(EnterpriseEntity)
    private readonly enterpriseRepository: Repository<EnterpriseEntity>,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── BƯỚC 1: Kiểm tra trùng MST/email → gửi OTP ─────────────────────────────
  async sendOtp(dto: SendBusinessOtpDto) {
    const email = dto.email.trim().toLowerCase();
    await this.assertNotRegistered(dto.taxCode, email);

    const allowed = await this.redisService.acquireOtpCooldown(`reg:${email}`, OTP_RESEND_SECONDS);
    if (!allowed) {
      throw new BadRequestException({
        code: ErrorCode.OTP_RESEND_TOO_SOON,
        message: `Vui lòng đợi ${OTP_RESEND_SECONDS} giây trước khi gửi lại mã.`,
      });
    }

    const otp = this.generateOtp();
    await this.redisService.setTemp(`reg_otp:${email}`, otp, OTP_EXPIRY_MINUTES * 60);
    await this.redisService.clearOtpAttempts(`reg:${email}`);

    await this.mailService.send(
      email,
      'Mã xác thực đăng ký tài khoản doanh nghiệp',
      `<p>Mã xác thực email đăng ký tài khoản doanh nghiệp của bạn là:</p>
       <p style="font-size:32px;font-weight:700;letter-spacing:8px;">${otp}</p>
       <p>Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>`,
    );

    return { message: 'Mã OTP đã được gửi tới email.', expiresInMinutes: OTP_EXPIRY_MINUTES };
  }

  // ─── BƯỚC 2: Xác thực OTP → cấp verifyToken ngắn hạn ───────────────────────
  async verifyOtp(dto: VerifyBusinessOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const scope = `reg:${email}`;
    const storedOtp = await this.redisService.getTemp(`reg_otp:${email}`);

    // OTP lưu trong Redis có TTL nên "hết hạn" và "chưa yêu cầu" đều là không tìm thấy
    if (!storedOtp) {
      throw new BadRequestException({
        code: ErrorCode.OTP_EXPIRED,
        message: 'Mã OTP đã hết hạn hoặc chưa được gửi. Vui lòng yêu cầu mã mới.',
      });
    }

    if (storedOtp !== dto.otp) {
      const attempts = await this.redisService.incrementOtpAttempts(scope, OTP_EXPIRY_MINUTES * 60);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.redisService.deleteTemp(`reg_otp:${email}`);
        await this.redisService.clearOtpAttempts(scope);
        throw new BadRequestException({
          code: ErrorCode.OTP_TOO_MANY_ATTEMPTS,
          message: 'Nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
        });
      }
      throw new BadRequestException({
        code: ErrorCode.OTP_INVALID,
        message: 'Mã OTP không đúng. Vui lòng kiểm tra lại.',
      });
    }

    await this.redisService.deleteTemp(`reg_otp:${email}`);
    await this.redisService.clearOtpAttempts(scope);

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.redisService.setTemp(`reg_vt:${verifyToken}`, email, VERIFY_TOKEN_TTL_SECONDS);

    return { verifyToken };
  }

  // ─── BƯỚC 3: Nhận hồ sơ + file → tạo doanh nghiệp và tài khoản ─────────────
  async register(dto: RegisterBusinessDto, files: BusinessFiles) {
    const email = dto.email.trim().toLowerCase();

    const verifiedEmail = await this.redisService.getTemp(`reg_vt:${dto.verifyToken}`);
    if (!verifiedEmail || verifiedEmail !== email) {
      throw new BadRequestException({
        code: ErrorCode.VERIFY_TOKEN_INVALID,
        message: 'Phiên xác thực email đã hết hạn. Vui lòng xác thực lại.',
      });
    }

    this.assertLevelFourIndustry(dto.mainIndustry);

    const license = files.businessLicense?.[0];
    if (!license) {
      throw new BadRequestException({
        code: ErrorCode.LICENSE_REQUIRED,
        message: 'Vui lòng tải lên Giấy phép kinh doanh.',
      });
    }
    const other = files.otherDocument?.[0];
    this.assertValidFile(license);
    if (other) this.assertValidFile(other);

    await this.assertNotRegistered(dto.taxCode, email);

    // Lưu file trước, nếu ghi DB lỗi thì xóa thư mục vừa tạo
    const uploadRoot = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    const relativeDir = path.join('enterprises', `${dto.taxCode}-${crypto.randomUUID()}`);
    const absoluteDir = path.resolve(uploadRoot, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const tempPassword = ENTERPRISE_INITIAL_PASSWORD;
    const roleId = Number(this.configService.get('ENTERPRISE_ROLE_ID', 2));

    try {
      const businessLicensePath = await this.writeFile(absoluteDir, relativeDir, 'business-license', license);
      const otherDocumentPath = other
        ? await this.writeFile(absoluteDir, relativeDir, 'other-document', other)
        : null;

      const passwordHash = await argon2.hash(tempPassword);

      await this.dataSource.transaction(async (manager) => {
        const enterprise = await manager.save(
          manager.create(EnterpriseEntity, {
            companyName: dto.companyName,
            taxCode: dto.taxCode,
            businessType: dto.businessType,
            mainIndustry: dto.mainIndustry,
            licenseDate: dto.licenseDate,
            province: dto.province,
            ward: dto.ward,
            address: dto.address,
            foreignName: dto.foreignName ?? null,
            email,
            officePhone: dto.officePhone ?? null,
            leaderName: dto.leaderName ?? null,
            leaderPhone: dto.leaderPhone ?? null,
            operatingProvince: dto.operatingProvince ?? null,
            operatingWard: dto.operatingWard ?? null,
            businessLocation: dto.businessLocation ?? null,
            businessLicensePath,
            otherDocumentPath,
          }),
        );

        // Tên đăng nhập của tài khoản doanh nghiệp = mã số thuế
        await manager.save(
          manager.create(UserEntity, {
            username: dto.taxCode,
            passwordHash,
            fullName: dto.leaderName || dto.companyName,
            email,
            phoneNumber: dto.leaderPhone ?? null,
            roleId,
            enterpriseId: enterprise.id,
            isActive: true,
          }),
        );
      });
    } catch (err) {
      await fs.rm(absoluteDir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }

    await this.redisService.deleteTemp(`reg_vt:${dto.verifyToken}`);

    // Gửi thông tin đăng nhập qua email; lỗi gửi mail không làm hỏng việc đăng ký
    // vì frontend đã hiển thị mật khẩu tạm ngay sau khi đăng ký.
    await this.mailService
      .send(
        email,
        'Tài khoản doanh nghiệp đã được tạo',
        `<p>Tài khoản cho <strong>${this.escapeHtml(dto.companyName)}</strong> đã được tạo.</p>
         <p>Tên đăng nhập: <strong>${this.escapeHtml(dto.taxCode)}</strong><br/>
            Mật khẩu tạm: <strong>${tempPassword}</strong></p>
         <p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>`,
      )
      .catch((err) => this.logger.warn(`Không gửi được email tài khoản tới ${email}`, err));

    return {
      username: dto.taxCode,
      tempPassword,
      companyName: dto.companyName,
      email,
    };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  private async assertNotRegistered(taxCode: string, email: string): Promise<void> {
    const [taxCodeTaken, usernameTaken] = await Promise.all([
      this.enterpriseRepository.exists({ where: { taxCode } }),
      this.userService.findByUsername(taxCode),
    ]);
    if (taxCodeTaken || usernameTaken) {
      throw new ConflictException({
        code: ErrorCode.TAX_CODE_EXISTS,
        message: 'Mã số thuế đã được đăng ký.',
      });
    }

    const [emailTakenByEnterprise, emailTakenByUser] = await Promise.all([
      this.enterpriseRepository.exists({ where: { email } }),
      this.userService.findByEmail(email),
    ]);
    if (emailTakenByEnterprise || emailTakenByUser) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_EXISTS,
        message: 'Email đã được sử dụng.',
      });
    }
  }

  private assertValidFile(file: UploadedBusinessFile): void {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: ErrorCode.FILE_TOO_LARGE,
        message: 'File vượt quá dung lượng cho phép (10MB).',
      });
    }
    const type = ALLOWED_FILE_TYPES[file.mimetype];
    const matchesMagic = type?.magic.every((byte, i) => file.buffer[i] === byte);
    if (!type || !matchesMagic) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_FILE_TYPE,
        message: 'Chỉ chấp nhận file PDF, JPG hoặc PNG.',
      });
    }
  }

  private assertLevelFourIndustry(mainIndustry: string): void {
    if (!LEVEL_FOUR_INDUSTRY_CODE_RE.test(mainIndustry)) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_MAIN_INDUSTRY,
        message: 'Chỉ được chọn ngành nghề kinh doanh cấp 4.',
      });
    }
  }

  private async writeFile(
    absoluteDir: string,
    relativeDir: string,
    baseName: string,
    file: UploadedBusinessFile,
  ): Promise<string> {
    const fileName = baseName + ALLOWED_FILE_TYPES[file.mimetype].ext;
    await fs.writeFile(path.join(absoluteDir, fileName), file.buffer);
    return path.join(relativeDir, fileName);
  }

  private generateOtp(): string {
    const num = Number(crypto.randomBytes(3).readUIntBE(0, 3)) % 1_000_000;
    return num.toString().padStart(6, '0');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
