namespace Dormitory.Web.Features.Accounts.Services
{
    /// <summary>
    /// Demo implementation - so sánh plain text.
    /// Trong production cần thay bằng BCrypt hoặc PBKDF2.
    /// </summary>
    public class PasswordHasher : IPasswordHasher
    {
        public string HashPassword(string password)
        {
            // Demo: trả về plain text. Thay bằng BCrypt trong production.
            return password;
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            // Demo: so sánh plain text. Thay bằng BCrypt.Verify trong production.
            return string.Equals(password, hashedPassword, StringComparison.Ordinal);
        }
    }
}
