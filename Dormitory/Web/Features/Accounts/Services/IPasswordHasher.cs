namespace Dormitory.Web.Features.Accounts.Services
{
    /// <summary>
    /// Interface cho việc hash và xác minh mật khẩu.
    /// </summary>
    public interface IPasswordHasher
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
    }
}
