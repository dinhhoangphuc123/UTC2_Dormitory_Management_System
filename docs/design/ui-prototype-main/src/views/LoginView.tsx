import React, { useState } from 'react';
import { DEMO_USERS } from '../data/mockData';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  darkMode,
  onToggleDarkMode,
  showToast,
}) => {
  const [username, setUsername] = useState('ql_an');
  const [password, setPassword] = useState('quanly123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const handleSelectDemo = (u: string, p: string, roleName: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setUsernameError(false);
    setPasswordError(false);
    showToast(`Đã điền tài khoản: ${roleName}`, 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(false);
    setPasswordError(false);
    setErrorMsg('');

    let hasError = false;
    if (!username.trim()) {
      setUsernameError(true);
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError(true);
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);

    setTimeout(() => {
      const matched = DEMO_USERS[username.trim()];
      if (matched && password.length >= 3) {
        showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
          onLoginSuccess(matched);
        }, 500);
      } else {
        setLoading(false);
        setErrorMsg('Tài khoản hoặc mật khẩu không đúng. Vui lòng bấm vào nút Demo bên dưới.');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F5F7] dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] transition-colors duration-200">
      {/* CỘT TRÁI (Khoảng 55%): Hình ảnh KTX, Gradient thương hiệu, Thông điệp */}
      <div className="relative lg:w-[55%] min-h-[420px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-[#071A38]">
        {/* Background Image with Overlay */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3dvVjk-VBybNNm2JxsMrQaZ6Xla-sc1rVEyAFG2H0jv9xDxwSH34iwwPfDDS5Jt2EcCbrNtjgifb_LUustJ5LLX-wWRxs5bE0pnmTNgzO6h2K7DI50Bd-B6AvG-rKGcoepNHgfiDO_KueLGSz5lU3Y3z9RCSJ4ehNXg7H2IRFbKzQfHe05BeiyY93w2dUCTFP3PpgR201q3ZUKv89imHbo0QV9GTn6hj2O_WjM7JszDgBpr67wdIlpA"
          alt="KTX UTC2 Campus"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />

        {/* Linear Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B2A5B]/85 to-[#071A38]/90 backdrop-blur-[2px]" />

        {/* Subtle Pattern Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        {/* Header Bên Trái: Logo và Tên phân hiệu */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-full bg-white p-0.5 shadow-lg flex items-center justify-center overflow-hidden border border-white/40">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGYdvcqp3rSyDsU3ZgkBsQXIR7k3bUm9ejInncJAQuJ5gd2szuChbhMQ8fpFYG-oGVlt4qrvEcRF-RIau-_yaHGxDM6i6_INXHLsIyhPpgKVvhTNH4SjGGjPeIe3ZiKRHgw-gDN84jhw0TVx8xGLpikBNfkw9R369xGJVkTBoeHrhqvmnwsKqyf9cPl3WTH1AimnMi2n_ipdXle85Quk5jLo-pekss71Hv9Am80tdBvoQv7FOOvx9QwPMpyqeVw8TUTLI"
                alt="Logo UTC2"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="whitespace-nowrap">
              <h1 className="text-xl font-bold tracking-normal text-white flex items-center gap-2 leading-snug mb-0.5">
                <span>KTX UTC2</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                  Portal
                </span>
              </h1>
              <p className="text-xs text-blue-200/80 font-medium tracking-normal">
                Ký túc xá · Phân hiệu TP.HCM
              </p>
            </div>
          </div>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label="Đổi chế độ sáng tối"
            className="relative z-10 shrink-0 w-9 h-9 rounded-lg bg-white/10 border border-white/15 text-white/90 hover:bg-white/20 transition flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        {/* Trung tâm: Tiêu đề lớn & Giá trị cốt lõi */}
        <div className="relative z-10 my-auto py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200/90 font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cổng thông tin Ký túc xá trực tuyến</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-normal text-white mb-6 leading-tight"
          >
            <span className="block pb-1.5">Hệ thống Quản lý</span>
            <span className="block">Ký túc xá</span>
          </h2>
          <p className="text-base sm:text-lg text-blue-200/90 font-medium tracking-wide max-w-lg">
            Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh
          </p>
        </div>

        {/* Footer Bên Trái */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs text-blue-200/60 pt-6 border-t border-white/10">
          <div className="text-blue-200/70 text-xs font-normal">
            © Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh
          </div>
          <div className="text-blue-200/50 text-[11px]">Hệ thống Quản lý Ký túc xá v2.4</div>
        </div>
      </div>

      {/* CỘT PHẢI (Khoảng 45%): Form Đăng nhập & Tài khoản Demo */}
      <div className="lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 xl:px-16 py-12 bg-white dark:bg-[#121826] transition-colors duration-200">
        <div className="w-full max-w-md mx-auto">
          {/* Header Form */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-normal leading-normal text-[#0B0F1A] dark:text-white">
              Đăng nhập
            </h2>
          </div>

          {/* Form Đăng nhập */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Alert Error */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-red-600">
                  error
                </span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Ô Tên đăng nhập */}
            <div>
              <label
                htmlFor="usernameInput"
                className="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5"
              >
                Tên đăng nhập / Mã số
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <input
                  type="text"
                  id="usernameInput"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập mã nhân viên hoặc MSSV (vd: ql_an)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] dark:focus:ring-[#4C7DD9] focus:border-transparent transition text-[#0B0F1A] dark:text-[#E8EAF0] placeholder:text-[#98A2B3]"
                />
              </div>
              {usernameError && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Vui lòng nhập tên đăng nhập
                </p>
              )}
            </div>

            {/* Ô Mật khẩu */}
            <div>
              <label
                htmlFor="passwordInput"
                className="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="passwordInput"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] dark:focus:ring-[#4C7DD9] focus:border-transparent transition text-[#0B0F1A] dark:text-[#E8EAF0] placeholder:text-[#98A2B3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Hiện hoặc ẩn mật khẩu"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#98A2B3] hover:text-[#0B2A5B] dark:hover:text-[#4C7DD9] transition"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Vui lòng nhập mật khẩu
                </p>
              )}
            </div>

            {/* Hàng Ghi nhớ & Quên mật khẩu */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E4E7EC] text-[#0B2A5B] focus:ring-[#0B2A5B] dark:border-[#232B3B] dark:bg-[#0B0F1A]"
                />
                <span className="text-xs text-[#667085] dark:text-slate-400 font-medium">
                  Ghi nhớ đăng nhập
                </span>
              </label>
              <button
                type="button"
                onClick={() =>
                  alert(
                    'Vui lòng liên hệ Văn phòng Quản lý KTX UTC2 (Phòng 102 - Tòa A) hoặc hotline 028.3896.6780 để cấp lại mật khẩu.'
                  )
                }
                className="text-xs font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Nút Đăng nhập Chính */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
              {!loading ? (
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              ) : (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          </form>

          {/* Phân cách Tài khoản Demo */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E7EC] dark:border-[#232B3B]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#121826] px-3 text-[#98A2B3] font-semibold tracking-wider">
                Tài khoản demo nhanh
              </span>
            </div>
          </div>

          {/* 4 Nút Demo Vai Trò */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectDemo('ql_an', 'quanly123', 'Quản lý KTX')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-xs ${
                username === 'ql_an'
                  ? 'bg-[#0B2A5B] text-white'
                  : 'border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B]'
              }`}
            >
              Quản lý KTX
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemo('kt_binh', 'ketoan123', 'Kế toán')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-xs ${
                username === 'kt_binh'
                  ? 'bg-[#0B2A5B] text-white'
                  : 'border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B]'
              }`}
            >
              Kế toán
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemo('sv_minh', 'sinhvien123', 'Sinh viên')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-xs ${
                username === 'sv_minh'
                  ? 'bg-[#0B2A5B] text-white'
                  : 'border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B]'
              }`}
            >
              Sinh viên
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemo('admin', 'admin123', 'Admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-xs ${
                username === 'admin'
                  ? 'bg-[#0B2A5B] text-white'
                  : 'border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B]'
              }`}
            >
              Admin
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-[#667085] dark:text-slate-400">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setShowRegistrationModal(true)}
                className="font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline"
              >
                Đăng ký nội trú
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Online Registration Info Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">
                  school
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Hướng dẫn Đăng ký nội trú KTX UTC2
                </h3>
              </div>
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Sinh viên chính quy Khóa mới (K65) và các khóa K62, K63, K64 có nguyện vọng lưu trú
                tại Ký túc xá UTC2 Phân hiệu TP.HCM nộp hồ sơ trực tuyến theo các đợt mở đăng ký:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-200">
                <li>
                  <strong>Hồ sơ ưu tiên:</strong> Bản scan Giấy chứng nhận hộ nghèo / cận nghèo, con
                  thương binh, liệt sĩ hoặc học sinh vùng sâu vùng xa (KV1).
                </li>
                <li>
                  <strong>Điểm xét tuyển:</strong> Điểm thi tuyển sinh hoặc điểm rèn luyện và GPA học
                  kỳ gần nhất.
                </li>
                <li>
                  <strong>Thời gian xử lý:</strong> Ban Quản lý duyệt hồ sơ và gửi thông báo phòng
                  trong vòng 24 - 48 giờ làm việc.
                </li>
              </ul>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[#0B2A5B] dark:text-blue-300">
                Đang có đợt xét tuyển tuyển sinh K65 với <strong>86 hồ sơ chờ duyệt</strong>.
                Bạn có thể đăng nhập bằng tài khoản <strong>Quản lý KTX</strong> để xem xét duyệt.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRegistrationModal(false);
                  handleSelectDemo('ql_an', 'quanly123', 'Quản lý KTX');
                }}
                className="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs hover:bg-[#143F8C] transition-colors"
              >
                Trải nghiệm với tài khoản Quản lý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
