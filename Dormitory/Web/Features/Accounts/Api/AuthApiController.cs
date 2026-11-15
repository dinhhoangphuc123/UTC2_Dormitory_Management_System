using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Accounts.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Middleware;
using Dormitory.Web.Shared.Models;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Accounts.Api
{
    [SkipAcademicYearScope]
    [ApiController]
    [Route("api/auth")]
    public class AuthApiController : ControllerBase
    {
        private const int ResetCodeLifetimeMinutes = 10;
        private const int MaxResetRequestsPerWindow = 5;
        private const int MaxResetCodeFailures = 5;
        private static readonly TimeSpan ResetRequestWindow = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan ResetRequestCooldown = TimeSpan.FromSeconds(60);

        private const string GenericForgotMessage =
            "Nếu thông tin tài khoản hợp lệ và có email, mã xác nhận đã được gửi.";

        private readonly IAuthService _authService;
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthApiController> _logger;
        private readonly ICurrentUser? _currentUser;

        public AuthApiController(
            IAuthService authService,
            ApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IConfiguration config,
            ILogger<AuthApiController> logger,
            ICurrentUser? currentUser = null)
        {
            _authService = authService;
            _context = context;
            _passwordHasher = passwordHasher;
            _config = config;
            _logger = logger;
            _currentUser = currentUser;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var (isValid, errorMessage) = LoginRequestValidator.Validate(request);

            if (!isValid)
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Dữ liệu không hợp lệ."));

            var profile = await _authService.LoginAsync(request);

            if (profile == null)
                return Unauthorized(ApiResponse.Fail("Tên đăng nhập hoặc mật khẩu không đúng."));

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, profile.Username),
                new(ClaimTypes.Name, profile.Name),
                new(ClaimTypes.Role, profile.RoleCode)
            };

            if (!string.IsNullOrWhiteSpace(profile.StaffId))
            {
                claims.Add(new Claim("StaffId", profile.StaffId));
            }

            if (!string.IsNullOrWhiteSpace(profile.StudentId))
            {
                claims.Add(new Claim("StudentId", profile.StudentId));
            }

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(2)
            };

            if (HttpContext?.RequestServices?.GetService<Microsoft.AspNetCore.Authentication.IAuthenticationService>() != null)
            {
                await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, authProperties);
            }

            return Ok(ApiResponse<UserProfileDto>.Ok(profile));
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUserProfile()
        {
            var username = _currentUser?.Username;
            if (string.IsNullOrWhiteSpace(username))
                return Unauthorized(ApiResponse.Fail("Không tìm thấy thông tin phiên đăng nhập."));

            var profile = await _authService.GetProfileAsync(username);
            if (profile == null)
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin tài khoản."));

            return Ok(ApiResponse<UserProfileDto>.Ok(profile));
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok(ApiResponse.Ok("Đã đăng xuất thành công."));
        }

        [Authorize]
        [HttpGet("profile/{username}")]
        public async Task<IActionResult> GetProfile(string username)
        {
            if (!string.Equals(_currentUser?.Username, username, StringComparison.OrdinalIgnoreCase) && _currentUser?.Role != RoleNames.Admin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Fail("Bạn chỉ có thể xem hồ sơ của chính mình."));
            }

            var profile = await _authService.GetProfileAsync(username);

            if (profile == null)
                return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

            return Ok(ApiResponse<UserProfileDto>.Ok(profile));
        }

        [HttpPost("forgot")]
        public async Task<IActionResult> Forgot([FromBody] ForgotRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Username))
                return BadRequest(ApiResponse.Fail("Vui lòng nhập tên đăng nhập."));

            var identifier = NormalizeIdentifier(req.Username);

            // Giới hạn tần suất gửi mã theo từng định danh để chống spam / brute force.
            var now = DateTime.UtcNow;
            var windowStart = now.Subtract(ResetRequestWindow);
            int requestsInWindow = await _context.MaDatLaiMatKhaus
                .CountAsync(x => x.DinhDanh == identifier && x.NgayTao >= windowStart);
            if (requestsInWindow >= MaxResetRequestsPerWindow)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, ApiResponse.Fail(
                    "Bạn đã yêu cầu mã xác nhận quá nhiều lần. Vui lòng thử lại sau ít phút."));
            }

            var lastRequestAt = await _context.MaDatLaiMatKhaus
                .Where(x => x.DinhDanh == identifier)
                .OrderByDescending(x => x.NgayTao)
                .Select(x => (DateTime?)x.NgayTao)
                .FirstOrDefaultAsync();
            if (lastRequestAt.HasValue && lastRequestAt.Value > now.Subtract(ResetRequestCooldown))
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, ApiResponse.Fail(
                    "Vui lòng chờ ít nhất 60 giây trước khi yêu cầu lại mã xác nhận."));
            }

            // Kiểm tra cấu hình SMTP trước khi tra tài khoản để không tiết lộ tài khoản có tồn tại hay không.
            var smtp = ReadSmtpSettings();
            if (smtp.MissingSettings.Count > 0)
            {
                _logger.LogWarning("SMTP configuration is missing required settings: {MissingSettings}",
                    string.Join(", ", smtp.MissingSettings));
                return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                    "Hiện chưa thể gửi email xác nhận. Vui lòng liên hệ Ban quản lý để được hỗ trợ."));
            }

            var account = await FindAccountAsync(identifier);

            var studentEmail = account?.SinhVien?.Email;
            var recipient = string.IsNullOrWhiteSpace(studentEmail) ? account?.NhanVien?.Email : studentEmail;
            if (string.IsNullOrWhiteSpace(recipient)
                && account != null
                && string.Equals(account.TenDangNhap, req.Username.Trim(), StringComparison.OrdinalIgnoreCase)
                && MailAddress.TryCreate(identifier, out _))
            {
                recipient = req.Username.Trim();
            }

            // Trả về thông báo chung để không tiết lộ tài khoản có tồn tại hay không.
            if (string.IsNullOrWhiteSpace(recipient))
            {
                return Ok(ApiResponse.Ok(GenericForgotMessage));
            }

            var code = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            try
            {
                using var client = new SmtpClient(smtp.Host!, smtp.Port)
                {
                    Credentials = new NetworkCredential(smtp.Username, smtp.Password),
                    EnableSsl = smtp.EnableSsl
                };
                using var mail = new MailMessage(smtp.From!, recipient, "Mã xác nhận đặt lại mật khẩu KTX", $"Mã xác nhận của bạn là: {code}")
                {
                    IsBodyHtml = false
                };
                await client.SendMailAsync(mail);

                _context.MaDatLaiMatKhaus.Add(new MaDatLaiMatKhau
                {
                    DinhDanh = identifier,
                    MaHash = _passwordHasher.HashPassword(code),
                    HetHan = now.AddMinutes(ResetCodeLifetimeMinutes),
                    SoLanSai = 0,
                    DaXacMinh = false,
                    NgayTao = now
                });
                await _context.SaveChangesAsync();

                return Ok(ApiResponse.Ok(GenericForgotMessage));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email for account {Identifier}", identifier);
                return StatusCode(StatusCodes.Status502BadGateway, ApiResponse.Fail(
                    "Không gửi được email xác nhận. Vui lòng thử lại sau hoặc liên hệ Ban quản lý."));
            }
        }

        [HttpPost("verify")]
        public async Task<IActionResult> Verify([FromBody] VerifyRequestDto req)
        {
            var identifier = NormalizeIdentifier(req.Username ?? string.Empty);
            var now = DateTime.UtcNow;

            var entry = await _context.MaDatLaiMatKhaus
                .Where(x => x.DinhDanh == identifier && !x.DaXacMinh && x.HetHan >= now)
                .OrderByDescending(x => x.NgayTao)
                .FirstOrDefaultAsync();

            if (entry == null)
            {
                return BadRequest(ApiResponse.Fail("Mã xác nhận không tồn tại hoặc đã hết hạn."));
            }

            if (!_passwordHasher.VerifyPassword(req.Code ?? string.Empty, entry.MaHash))
            {
                entry.SoLanSai++;
                if (entry.SoLanSai >= MaxResetCodeFailures)
                {
                    _context.MaDatLaiMatKhaus.Remove(entry);
                    await _context.SaveChangesAsync();
                    return BadRequest(ApiResponse.Fail("Bạn đã nhập sai mã xác nhận quá 5 lần. Mã đã bị hủy."));
                }

                await _context.SaveChangesAsync();
                return BadRequest(ApiResponse.Fail(
                    $"Mã xác nhận không đúng. Còn {MaxResetCodeFailures - entry.SoLanSai} lần thử."));
            }

            entry.DaXacMinh = true;
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Mã xác nhận đúng."));
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset([FromBody] ResetRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.NewPassword))
                return BadRequest(ApiResponse.Fail("Vui lòng nhập đầy đủ thông tin."));

            var (isValidPassword, passwordError) = PasswordPolicy.Validate(req.NewPassword);
            if (!isValidPassword)
                return BadRequest(ApiResponse.Fail(passwordError ?? "Mật khẩu mới không hợp lệ."));

            var identifier = NormalizeIdentifier(req.Username);
            var now = DateTime.UtcNow;

            var entry = await _context.MaDatLaiMatKhaus
                .Where(x => x.DinhDanh == identifier && x.DaXacMinh && x.HetHan >= now)
                .OrderByDescending(x => x.NgayTao)
                .FirstOrDefaultAsync();

            if (entry == null || !_passwordHasher.VerifyPassword(req.Code ?? string.Empty, entry.MaHash))
            {
                return BadRequest(ApiResponse.Fail(
                    "Vui lòng xác minh đúng mã OTP còn hiệu lực trước khi đổi mật khẩu."));
            }

            var account = await FindAccountAsync(identifier);
            if (account == null)
                return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

            account.MatKhauHash = _passwordHasher.HashPassword(req.NewPassword);

            // Mã chỉ dùng được một lần; xóa toàn bộ mã cũ của định danh này.
            var oldCodes = await _context.MaDatLaiMatKhaus
                .Where(x => x.DinhDanh == identifier)
                .ToListAsync();
            _context.MaDatLaiMatKhaus.RemoveRange(oldCodes);

            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Đặt lại mật khẩu thành công."));
        }

        private Task<TaiKhoan?> FindAccountAsync(string normalizedIdentifier)
        {
            var raw = normalizedIdentifier.Trim();
            return _context.TaiKhoans
                .Include(t => t.SinhVien)
                .Include(t => t.NhanVien)
                .FirstOrDefaultAsync(t =>
                    t.TenDangNhap.ToLower() == raw
                    || (t.SinhVien != null && t.SinhVien.Email != null && t.SinhVien.Email.ToLower() == raw)
                    || (t.NhanVien != null && t.NhanVien.Email != null && t.NhanVien.Email.ToLower() == raw));
        }

        private static string NormalizeIdentifier(string value) => value.Trim().ToLowerInvariant();

        private SmtpSettings ReadSmtpSettings()
        {
            var gmailSmtp = _config.GetSection("GmailSMTP");
            var legacySmtp = _config.GetSection("Smtp");
            var host = FirstConfiguredValue(gmailSmtp["Host"], legacySmtp["Host"]);
            var from = FirstConfiguredValue(gmailSmtp["From"], legacySmtp["From"]);
            var username = FirstConfiguredValue(
                gmailSmtp["Username"],
                gmailSmtp["From"],
                legacySmtp["Username"],
                legacySmtp["From"]);
            var rawPassword = FirstConfiguredValue(
                gmailSmtp["AppPassword"],
                gmailSmtp["Password"],
                legacySmtp["Password"]);
            var password = new string((rawPassword ?? string.Empty)
                .Where(character => !char.IsWhiteSpace(character))
                .ToArray());
            var configuredPort = FirstConfiguredValue(gmailSmtp["Port"], legacySmtp["Port"]);
            var port = int.TryParse(configuredPort, out var parsedPort) ? parsedPort : 587;
            var configuredEnableSsl = FirstConfiguredValue(gmailSmtp["EnableSsl"], legacySmtp["EnableSsl"]);
            var enableSsl = bool.TryParse(configuredEnableSsl, out var parsedEnableSsl)
                ? parsedEnableSsl
                : true;

            var missing = new List<string>();
            if (string.IsNullOrWhiteSpace(host)) missing.Add("Host");
            if (string.IsNullOrWhiteSpace(from)) missing.Add("From");
            if (string.IsNullOrWhiteSpace(username)) missing.Add("Username");
            if (string.IsNullOrWhiteSpace(password)) missing.Add("AppPassword/Password");

            return new SmtpSettings(host, from, username, password, port, enableSsl, missing);
        }

        private static string? FirstConfiguredValue(params string?[] values)
        {
            return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
        }

        private sealed record SmtpSettings(
            string? Host,
            string? From,
            string? Username,
            string? Password,
            int Port,
            bool EnableSsl,
            List<string> MissingSettings);
    }

    public class ForgotRequestDto { public string Username { get; set; } = string.Empty; }
    public class VerifyRequestDto { public string Username { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; }
    public class ResetRequestDto { public string Username { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}
