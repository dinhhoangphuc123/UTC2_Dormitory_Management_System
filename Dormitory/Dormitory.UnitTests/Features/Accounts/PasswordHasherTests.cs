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
    }
}

