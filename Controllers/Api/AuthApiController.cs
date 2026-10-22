using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
{
    [ApiController]
    [Route("api/auth")]
    public class AuthApiController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthApiController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            {
                return BadRequest(ApiResponse.Fail("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu."));
            }

            var profile = await _authService.AuthenticateAsync(req.Username, req.Password);
            if (profile == null)
            {
                return Unauthorized(ApiResponse.Fail("Tài khoản hoặc mật khẩu không chính xác."));
            }

            return Ok(ApiResponse<UserProfileDto>.Ok(profile, "Đăng nhập thành công!"));
        }

        [HttpGet("profile/{username}")]
        public async Task<IActionResult> GetProfile(string username)
        {
            var profile = await _authService.GetProfileByUsernameAsync(username);
            if (profile == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin tài khoản."));
            }

            return Ok(ApiResponse<UserProfileDto>.Ok(profile));
        }
    }
}
