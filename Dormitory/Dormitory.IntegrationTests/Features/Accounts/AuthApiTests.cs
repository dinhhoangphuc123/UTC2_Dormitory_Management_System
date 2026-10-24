using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Accounts.Api;
using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Entities;
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
            var passwordHasher = new PasswordHasher();
            var service = new AuthService(context, passwordHasher);
            var controller = new AuthApiController(service, context, passwordHasher, new ConfigurationBuilder().Build(), NullLogger<AuthApiController>.Instance);

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
            var passwordHasher = new PasswordHasher();
            var service = new AuthService(context, passwordHasher);
            var controller = new AuthApiController(service, context, passwordHasher, new ConfigurationBuilder().Build(), NullLogger<AuthApiController>.Instance);

            var result = await controller.Login(new LoginRequestDto
            {
                Username = "ql_an",
                Password = "wrongpassword"
            });

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Theory]
        [InlineData("ql_an")]
        [InlineData("vanan.ktx@utc2.edu.vn")]
        public async Task Forgot_WithMissingSmtpConfiguration_ReturnsServiceUnavailable(string usernameOrEmail)
        {
            using var context = _fixture.CreateDbContext();
            var passwordHasher = new PasswordHasher();
            var service = new AuthService(context, passwordHasher);
            var controller = new AuthApiController(service, context, passwordHasher, new ConfigurationBuilder().Build(), NullLogger<AuthApiController>.Instance);

            var result = await controller.Forgot(new ForgotRequestDto
            {
                Username = usernameOrEmail
            });

            var response = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        }

        [Theory]
        [InlineData("admin")]
        [InlineData("quanLy")]
        [InlineData("keToan")]
        [InlineData("nhanVien")]
        [InlineData("sinhVien")]
        public async Task Forgot_WithEmailUsernameAndNoLinkedProfile_AllowsAnyRole(string roleCode)
        {
            using var context = _fixture.CreateDbContext();
            var emailUsername = $"reset-{Guid.NewGuid():N}@example.com";
            context.TaiKhoans.Add(new TaiKhoan
            {
                TenDangNhap = emailUsername,
                MatKhauHash = "existing-password-hash",
                MaVaiTro = roleCode,
                LaDangHoat = true
            });
            await context.SaveChangesAsync();

            var passwordHasher = new PasswordHasher();
            var service = new AuthService(context, passwordHasher);
            var controller = new AuthApiController(service, context, passwordHasher, new ConfigurationBuilder().Build(), NullLogger<AuthApiController>.Instance);

            var result = await controller.Forgot(new ForgotRequestDto
            {
                Username = emailUsername
            });

            var response = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        }
    }
}
