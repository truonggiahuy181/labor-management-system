// src/services/mockAuth.ts
// API giả để làm giao diện khi backend chưa xong. Bật bằng NEXT_PUBLIC_MOCK_API=true.
// Có API thật rồi thì xoá file này và dòng import nó trong auth.ts.
import type { ApiResponse, AuthApi, RegisterBody, User } from './auth';

const DB_KEY = 'mockUsers';      // danh sách tài khoản giả trong localStorage
const OTP_KEY = 'mockOtp';       // OTP vừa "gửi" + email nhận
const SESSION_KEY = 'mockSession'; // id user đang đăng nhập – đóng vai cookie của server thật
const MOCK_OTP = '123456';
const DELAY_MS = 600;            // giả lập độ trễ mạng để thấy nút bị khoá khi đang gửi

type MockUser = User & {
  password: string;
  companyName: string;
  taxCode: string;
  phone: string;
};

const SEED_USERS: MockUser[] = [
  {
    id: '1',
    username: 'demo',
    email: 'demo@vna.vn',
    password: '12345678',
    companyName: 'Công ty Demo',
    taxCode: '0101234567',
    phone: '0912345678',
  },
];

// ---------- "Cơ sở dữ liệu" giả ----------
const loadUsers = (): MockUser[] => {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : SEED_USERS;
};

const saveUsers = (users: MockUser[]) => localStorage.setItem(DB_KEY, JSON.stringify(users));

// Không bao giờ trả password ra ngoài, giống server thật
const toUser = ({ id, username, email }: MockUser): User => ({ id, username, email });

// Server thật đọc cookie; mock đọc id đã lưu lúc login
const currentUser = () => {
  const id = localStorage.getItem(SESSION_KEY);
  return loadUsers().find((u) => u.id === id);
};

// ---------- Trả kết quả sau DELAY_MS ----------
const respond = <T>(body: ApiResponse<T>) =>
  new Promise<ApiResponse<T>>((resolve) => setTimeout(() => resolve(body), DELAY_MS));

const ok = <T>(data: T) => respond<T>({ success: true, data });

const fail = (code: string) => respond<never>({ success: false, data: null as never, code });

// ---------- Các hàm giống hệt authApi thật ----------
export const mockAuthApi: AuthApi = {
  login: ({ username, password }) => {
    const user = loadUsers().find((u) => u.username === username && u.password === password);
    if (!user) return fail('WRONG_PASSWORD');
    localStorage.setItem(SESSION_KEY, user.id);
    return ok({ user: toUser(user) });
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    return ok(null);
  },

  register: (body: RegisterBody) => {
    const users = loadUsers();
    if (users.some((u) => u.username === body.username)) return fail('USERNAME_EXISTS');
    if (users.some((u) => u.email === body.email)) return fail('EMAIL_EXISTS');
    if (users.some((u) => u.taxCode === body.taxCode)) return fail('TAX_CODE_EXISTS');

    saveUsers([...users, { ...body, id: String(Date.now()) }]);
    return ok(null);
  },

  forgotPassword: ({ email }) => {
    if (!loadUsers().some((u) => u.email === email)) return fail('EMAIL_NOT_FOUND');

    localStorage.setItem(OTP_KEY, JSON.stringify({ email, otp: MOCK_OTP }));
    console.info(`[mock] OTP gửi tới ${email}: ${MOCK_OTP}`);
    return ok(null);
  },

  resetPassword: ({ email, otp, newPassword }) => {
    const saved = JSON.parse(localStorage.getItem(OTP_KEY) ?? 'null');
    if (!saved || saved.email !== email || saved.otp !== otp) return fail('OTP_INVALID');

    saveUsers(loadUsers().map((u) => (u.email === email ? { ...u, password: newPassword } : u)));
    localStorage.removeItem(OTP_KEY);          // OTP chỉ dùng được 1 lần
    return ok(null);
  },

  changePassword: ({ oldPassword, newPassword }) => {
    const me = currentUser();
    if (!me) return fail('UNAUTHORIZED');
    if (me.password !== oldPassword) return fail('WRONG_OLD_PASSWORD');

    saveUsers(loadUsers().map((u) => (u.id === me.id ? { ...u, password: newPassword } : u)));
    return ok(null);
  },

  me: () => {
    const me = currentUser();
    // Chưa đăng nhập → ném lỗi giống server trả 401
    return me ? ok(toUser(me)) : Promise.reject(new Error('UNAUTHORIZED'));
  },
};