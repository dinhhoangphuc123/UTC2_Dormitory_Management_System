using Dormitory.Web.Features.Accounts.Services;

namespace Dormitory.UnitTests.Features.Accounts
{
    public class PasswordHasherTests
    {
        private readonly PasswordHasher _hasher = new();

        [Fact]
        public void HashPassword_ShouldReturnNonEmptyString()
        {
            var hash = _hasher.HashPassword("123456");
            Assert.False(string.IsNullOrWhiteSpace(hash));
        }

        [Fact]
        public void VerifyPassword_WithCorrectPassword_ShouldReturnTrue()
        {
            var hash = _hasher.HashPassword("secret123");
            var result = _hasher.VerifyPassword("secret123", hash);
            Assert.True(result);
        }

        [Fact]
        public void VerifyPassword_WithIncorrectPassword_ShouldReturnFalse()
        {
            var hash = _hasher.HashPassword("secret123");
            var result = _hasher.VerifyPassword("wrong", hash);
            Assert.False(result);
        }

        [Fact]
        public void VerifyPassword_WithLegacyPlaintext_ShouldReturnFalse()
        {
            // Mật khẩu lưu dạng plaintext không còn được chấp nhận.
            var result = _hasher.VerifyPassword("quanly123", "quanly123");
            Assert.False(result);
        }

        [Theory]
        [InlineData("short1")]
        [InlineData("onlyletters")]
        [InlineData("12345678")]
        public void PasswordPolicy_RejectsWeakPasswords(string password)
        {
            var (isValid, _) = PasswordPolicy.Validate(password);
            Assert.False(isValid);
        }

        [Fact]
        public void PasswordPolicy_AcceptsStrongPassword()
        {
            var (isValid, _) = PasswordPolicy.Validate("quanly123");
            Assert.True(isValid);
        }
    }
}

