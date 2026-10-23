using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Accounts.Api;
using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Services;

namespace Dormitory.IntegrationTests.Features.Accounts
{
    public class AuthApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public AuthApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsOk()
        {
            using var context = _fixture.CreateDbContext();
            var service = new AuthService(context, new PasswordHasher());
            var controller = new AuthApiController(service);

            var result = await controller.Login(new LoginRequestDto
            {
                Username = "ql_an",
                Password = "quanly123"
            });

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
        {
            using var context = _fixture.CreateDbContext();
            var service = new AuthService(context, new PasswordHasher());
            var controller = new AuthApiController(service);

            var result = await controller.Login(new LoginRequestDto
            {
                Username = "ql_an",
                Password = "wrongpassword"
            });

            Assert.IsType<UnauthorizedObjectResult>(result);
        }
    }
}

