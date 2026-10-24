using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Accounts.Validators;
using System.Net;
using System.Net.Mail;

namespace Dormitory.Web.Features.Accounts.Api
{
    [ApiController]
    [Route("api/auth")]
    public class AuthApiController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthApiController> _logger;
        private static readonly Dictionary<string, string> _resetCodes = new();

        public AuthApiController(
            IAuthService authService,
            ApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IConfiguration config,
            ILogger<AuthApiController> logger)
        {
            _authService = authService;
            _context = context;
            _passwordHasher = passwordHasher;
            _config = config;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var (isValid, errorMessage) = LoginRequestValidator.Validate(request);

            if (!isValid)
                return BadRequest(new { success = false, message = errorMessage });

            var profile = await _authService.LoginAsync(request);

            if (profile == null)
                return Unauthorized(new { success = false, message = "Tên đăng nhập hoặc mật khẩu không đúng." });

            return Ok(new { success = true, data = profile });
        }

        [HttpGet("profile/{username}")]
        public async Task<IActionResult> GetProfile(string username)
        {
            var profile = await _authService.GetProfileAsync(username);

            if (profile == null)
                return NotFound(new { success = false, message = "Không tìm thấy tài khoản." });

            return Ok(new { success = true, data = profile });
        }

        [HttpPost("forgot")]
        public async Task<IActionResult> Forgot([FromBody] ForgotRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Username))
                return BadRequest(new { success = false, message = "Vui lòng nhập tên đăng nhập." });

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

            if (string.IsNullOrWhiteSpace(recipient))
                return BadRequest(new { success = false, message = "Không tìm thấy tài khoản hoặc tài khoản chưa có email." });

            var host = _config["Smtp:Host"];
            var smtpUsername = _config["Smtp:Username"];
            var password = _config["Smtp:Password"];
            var from = _config["Smtp:From"];
            var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
            var enableSsl = bool.TryParse(_config["Smtp:EnableSsl"], out var s) ? s : true;

            if (string.IsNullOrWhiteSpace(host)
                || string.IsNullOrWhiteSpace(smtpUsername)
                || string.IsNullOrWhiteSpace(password)
                || string.IsNullOrWhiteSpace(from))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    success = false,
                    message = "Chức năng gửi email chưa được cấu hình SMTP. Vui lòng liên hệ Ban quản lý."
                });
            }

            var code = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            try
            {
                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(smtpUsername, password),
                    EnableSsl = enableSsl
                };
                using var mail = new MailMessage(from, recipient, "Mã xác nhận đặt lại mật khẩu KTX", $"Mã xác nhận của bạn là: {code}")
                {
                    IsBodyHtml = false
                };
                await client.SendMailAsync(mail);
                _resetCodes[identifier] = code;
                return Ok(new { success = true, message = "Đã gửi mã xác nhận về email." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email for account {Identifier}", identifier);
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    success = false,
                    message = "Không gửi được email xác nhận. Vui lòng kiểm tra cấu hình SMTP hoặc liên hệ Ban quản lý."
                });
            }
        }

        [HttpPost("verify")]
        public IActionResult Verify([FromBody] VerifyRequestDto req)
        {
            if (_resetCodes.TryGetValue(req.Username?.Trim() ?? "", out var code) && code == req.Code)
                return Ok(new { success = true, message = "Mã xác nhận đúng." });
            return BadRequest(new { success = false, message = "Mã xác nhận không đúng." });
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset([FromBody] ResetRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.NewPassword))
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ thông tin." });
            var identifier = req.Username.Trim();
            if (!_resetCodes.TryGetValue(identifier, out var code) || code != req.Code)
                return BadRequest(new { success = false, message = "Mã xác nhận không đúng." });

            var account = await _context.TaiKhoans.FirstOrDefaultAsync(t =>
                t.TenDangNhap == identifier
                || (t.SinhVien != null && t.SinhVien.Email == identifier)
                || (t.NhanVien != null && t.NhanVien.Email == identifier));
            if (account == null)
                return NotFound(new { success = false, message = "Không tìm thấy tài khoản." });

            account.MatKhauHash = _passwordHasher.HashPassword(req.NewPassword);
            await _context.SaveChangesAsync();
            _resetCodes.Remove(identifier);
            return Ok(new { success = true, message = "Đặt lại mật khẩu thành công." });
        }
    }

    public class ForgotRequestDto { public string Username { get; set; } = string.Empty; }
    public class VerifyRequestDto { public string Username { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; }
    public class ResetRequestDto { public string Username { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}
