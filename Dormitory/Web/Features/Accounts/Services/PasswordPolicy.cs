using System.Security.Cryptography;

namespace Dormitory.Web.Features.Accounts.Services
{
    public static class PasswordPolicy
    {
        public const int MinLength = 8;
        public const int MaxLength = 100;

        private const string UpperChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        private const string LowerChars = "abcdefghijkmnopqrstuvwxyz";
        private const string DigitChars = "23456789";
        private const string SymbolChars = "@#$_";

        /// <summary>
        /// Sinh mật khẩu tạm ngẫu nhiên đủ mạnh để cấp cho tài khoản mới.
        /// Người dùng phải đổi lại sau lần đăng nhập đầu tiên.
        /// </summary>
        public static string GenerateTemporaryPassword(int length = 12)
        {
            if (length < MinLength) length = MinLength;

            var chars = new List<char>
            {
                UpperChars[RandomNumberGenerator.GetInt32(UpperChars.Length)],
                LowerChars[RandomNumberGenerator.GetInt32(LowerChars.Length)],
                DigitChars[RandomNumberGenerator.GetInt32(DigitChars.Length)],
                SymbolChars[RandomNumberGenerator.GetInt32(SymbolChars.Length)]
            };

            var all = UpperChars + LowerChars + DigitChars;
            while (chars.Count < length)
            {
                chars.Add(all[RandomNumberGenerator.GetInt32(all.Length)]);
            }

            // Xáo trộn để ký tự đặc biệt không luôn nằm ở cuối.
            for (int i = chars.Count - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }

            return new string(chars.ToArray());
        }

        public static (bool IsValid, string? ErrorMessage) Validate(string? password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < MinLength)
            {
                return (false, $"Mật khẩu phải có ít nhất {MinLength} ký tự.");
            }

            if (password.Length > MaxLength)
            {
                return (false, $"Mật khẩu không được vượt quá {MaxLength} ký tự.");
            }

            bool hasLetter = password.Any(char.IsLetter);
            bool hasDigit = password.Any(char.IsDigit);
            if (!hasLetter || !hasDigit)
            {
                return (false, "Mật khẩu phải bao gồm cả chữ và số.");
            }

            return (true, null);
        }
    }
}
