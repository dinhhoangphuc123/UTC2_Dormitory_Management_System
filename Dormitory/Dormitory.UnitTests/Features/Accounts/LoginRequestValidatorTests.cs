using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Validators;

namespace Dormitory.UnitTests.Features.Accounts
{
    public class LoginRequestValidatorTests
    {
        [Fact]
        public void Validate_WithValidCredentials_ShouldPass()
        {
            var req = new LoginRequestDto { Username = "ql_an", Password = "123" };
            var (isValid, errorMessage) = LoginRequestValidator.Validate(req);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Theory]
        [InlineData("", "123")]
        [InlineData("   ", "123")]
        [InlineData("ql_an", "")]
        [InlineData("ql_an", "   ")]
        public void Validate_WithEmptyFields_ShouldFail(string username, string password)
        {
            var req = new LoginRequestDto { Username = username, Password = password };
            var (isValid, _) = LoginRequestValidator.Validate(req);
            Assert.False(isValid);
        }
    }
}

