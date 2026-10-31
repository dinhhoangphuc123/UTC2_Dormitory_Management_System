using System.Security.Cryptography;

namespace Dormitory.Web.Features.Accounts.Services
{
    public class PasswordHasher : IPasswordHasher
    {
        private const int Iterations = 100000;
        private const int SaltSize = 16;
        private const int KeySize = 32;

        public string HashPassword(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
            return $"PBKDF2${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            if (string.IsNullOrEmpty(hashedPassword))
                return false;

            if (hashedPassword.StartsWith("PBKDF2$", StringComparison.Ordinal))
            {
                var parts = hashedPassword.Split('$');
                if (parts.Length != 4)
                    return false;

                if (!int.TryParse(parts[1], out var iterations))
                    return false;

                try
                {
                    var salt = Convert.FromBase64String(parts[2]);
                    var expectedHash = Convert.FromBase64String(parts[3]);
                    var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedHash.Length);
                    return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
                }
                catch
                {
                    return false;
                }
            }

            // Fallback: hỗ trợ mật khẩu seed cũ dạng plain text
            return string.Equals(password, hashedPassword, StringComparison.Ordinal);
        }

        public static bool IsLegacyPlaintext(string hashedPassword)
        {
            return !string.IsNullOrEmpty(hashedPassword) && !hashedPassword.StartsWith("PBKDF2$", StringComparison.Ordinal);
        }
    }
}
