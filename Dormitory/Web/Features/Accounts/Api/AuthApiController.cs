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
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Accounts.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Models;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Accounts.Api
{
    [ApiController]
    [Route("api/auth")]
    public class AuthApiController : ControllerBase
    {
        private class OtpEntry
        {
            public string Code { get; set; } = string.Empty;
            public DateTime ExpiresAt { get; set; }
            public int FailedAttempts { get; set; }
        }

        private readonly IAuthService _authService;
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthApiController> _logger;
        private readonly ICurrentUser? _currentUser;

        private static readonly object _resetCodesLock = new();
        private static readonly Dictionary<string, OtpEntry> _resetOtps = new(StringComparer.OrdinalIgnoreCase);
        private static readonly HashSet<string> _verifiedResetIdentifiers = new(StringComparer.OrdinalIgnoreCase);

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
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
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

            var identifier = req.Username.Trim();
            var account = await _context.TaiKhoans
                .Include(t => t.SinhVien)
                .Include(t => t.NhanVien)
                .FirstOrDefaultAsync(t =>
                    t.TenDangNhap == identifier
                    || (t.SinhVien != null && t.SinhVien.Email == identifier)
                    || (t.NhanVien != null && t.NhanVien.Email == identifier));

            var studentEmail = account?.SinhVien?.Email;
            var recipient = string.IsNullOrWhiteSpace(studentEmail) ? account?.NhanVien?.Email : studentEmail;
            if (string.IsNullOrWhiteSpace(recipient)
                && account != null
                && string.Equals(account.TenDangNhap, identifier, StringComparison.OrdinalIgnoreCase)
                && MailAddress.TryCreate(identifier, out _))
            {
                recipient = identifier;
            }

            // Trả về thông báo chung để không tiết lộ tài khoản có tồn tại hay không
            if (string.IsNullOrWhiteSpace(recipient))
            {
                return Ok(ApiResponse.Ok("Nếu thông tin tài khoản hợp lệ và có email, mã xác nhận đã được gửi."));
            }

            var gmailSmtp = _config.GetSection("GmailSMTP");
            var legacySmtp = _config.GetSection("Smtp");
            var host = FirstConfiguredValue(gmailSmtp["Host"], legacySmtp["Host"]);
            var from = FirstConfiguredValue(gmailSmtp["From"], legacySmtp["From"]);
            var smtpUsername = FirstConfiguredValue(
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

            var missingSettings = new List<string>();
            if (string.IsNullOrWhiteSpace(host)) missingSettings.Add("Host");
            if (string.IsNullOrWhiteSpace(from)) missingSettings.Add("From");
            if (string.IsNullOrWhiteSpace(smtpUsername)) missingSettings.Add("Username");
            if (string.IsNullOrWhiteSpace(password)) missingSettings.Add("AppPassword/Password");

            if (missingSettings.Count > 0)
            {
                _logger.LogWarning("SMTP configuration is missing required keys: {MissingSettings}", string.Join(", ", missingSettings));
                return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse.Fail(
                    $"Thiếu cấu hình SMTP: {string.Join(", ", missingSettings)}. Kiểm tra mục GmailSMTP hoặc Smtp trong cấu hình ứng dụng."));
            }

            var code = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            try
            {
                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(smtpUsername, password),
                    EnableSsl = enableSsl
                };
                using var mail = new MailMessage(from!, recipient, "Mã xác nhận đặt lại mật khẩu KTX", $"Mã xác nhận của bạn là: {code}")
                {
                    IsBodyHtml = false
                };
                await client.SendMailAsync(mail);
                lock (_resetCodesLock)
                {
                    _resetOtps[identifier] = new OtpEntry
                    {
                        Code = code,
                        ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                        FailedAttempts = 0
                    };
                    _verifiedResetIdentifiers.Remove(identifier);
                }
                return Ok(ApiResponse.Ok("Nếu thông tin tài khoản hợp lệ và có email, mã xác nhận đã được gửi."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email for account {Identifier}", identifier);
                return StatusCode(StatusCodes.Status502BadGateway, ApiResponse.Fail(
                    "Không gửi được email xác nhận. Vui lòng kiểm tra cấu hình SMTP hoặc liên hệ Ban quản lý."));
            }
        }

        [HttpPost("verify")]
        public IActionResult Verify([FromBody] VerifyRequestDto req)
        {
            var identifier = req.Username?.Trim() ?? string.Empty;
            lock (_resetCodesLock)
            {
                if (!_resetOtps.TryGetValue(identifier, out var entry))
                {
                    return BadRequest(ApiResponse.Fail("Mã xác nhận không tồn tại hoặc đã hết hạn."));
                }

                if (DateTime.UtcNow > entry.ExpiresAt)
                {
                    _resetOtps.Remove(identifier);
                    return BadRequest(ApiResponse.Fail("Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới."));
                }

                if (entry.Code != req.Code)
                {
                    entry.FailedAttempts++;
                    if (entry.FailedAttempts >= 5)
                    {
                        _resetOtps.Remove(identifier);
                        return BadRequest(ApiResponse.Fail("Bạn đã nhập sai mã xác nhận quá 5 lần. Mã đã bị hủy."));
                    }
                    return BadRequest(ApiResponse.Fail($"Mã xác nhận không đúng. Còn {5 - entry.FailedAttempts} lần thử."));
                }

                _verifiedResetIdentifiers.Add(identifier);
                return Ok(ApiResponse.Ok("Mã xác nhận đúng."));
            }
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset([FromBody] ResetRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.NewPassword))
                return BadRequest(ApiResponse.Fail("Vui lòng nhập đầy đủ thông tin."));

            var identifier = req.Username.Trim();
            lock (_resetCodesLock)
            {
                var isVerified = _verifiedResetIdentifiers.Contains(identifier)
                    && _resetOtps.TryGetValue(identifier, out var entry)
                    && entry.Code == req.Code
                    && DateTime.UtcNow <= entry.ExpiresAt;

                if (!isVerified)
                    return BadRequest(ApiResponse.Fail("Vui lòng xác minh đúng mã OTP còn hiệu lực trước khi đổi mật khẩu."));
            }

            var account = await _context.TaiKhoans.FirstOrDefaultAsync(t =>
                t.TenDangNhap == identifier
                || (t.SinhVien != null && t.SinhVien.Email == identifier)
                || (t.NhanVien != null && t.NhanVien.Email == identifier));
            if (account == null)
                return NotFound(ApiResponse.Fail("Không tìm thấy tài khoản."));

            account.MatKhauHash = _passwordHasher.HashPassword(req.NewPassword);
            await _context.SaveChangesAsync();

            lock (_resetCodesLock)
            {
                _resetOtps.Remove(identifier);
                _verifiedResetIdentifiers.Remove(identifier);
            }

            return Ok(ApiResponse.Ok("Đặt lại mật khẩu thành công."));
        }

        private static string? FirstConfiguredValue(params string?[] values)
        {
            return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
        }
    }

    public class ForgotRequestDto { public string Username { get; set; } = string.Empty; }
    public class VerifyRequestDto { public string Username { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; }
    public class ResetRequestDto { public string Username { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}
