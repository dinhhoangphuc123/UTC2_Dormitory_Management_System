namespace Dormitory.Web.Features.Accounts.DTOs
{
    public class LoginRequestDto
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public bool RememberMe { get; set; } = true;
    }
}
