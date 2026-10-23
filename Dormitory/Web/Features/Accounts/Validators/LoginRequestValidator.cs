using Dormitory.Web.Features.Accounts.DTOs;

namespace Dormitory.Web.Features.Accounts.Validators
{
    public static class LoginRequestValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
                return (false, "Tên đăng nhập không được để trống.");

            if (string.IsNullOrWhiteSpace(request.Password))
                return (false, "Mật khẩu không được để trống.");

            if (request.Username.Length > 50)
                return (false, "Tên đăng nhập không được quá 50 ký tự.");

            return (true, null);
        }
    }
}
