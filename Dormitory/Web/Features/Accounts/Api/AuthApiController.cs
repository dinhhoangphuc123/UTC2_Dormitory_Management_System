using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Accounts.Validators;

namespace Dormitory.Web.Features.Accounts.Api
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthApiController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthApiController(IAuthService authService)
        {
            _authService = authService;
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
    }
}
