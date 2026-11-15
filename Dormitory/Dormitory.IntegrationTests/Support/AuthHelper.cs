using System.Net.Http.Json;
using Dormitory.Web.Features.Accounts.DTOs;

namespace Dormitory.IntegrationTests.Support
{
    public static class AuthHelper
    {
        public static async Task<HttpClient> CreateAuthenticatedClientAsync(CustomWebApplicationFactory factory, string username = "ql_an", string password = "quanly123")
        {
            var client = factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto
            {
                Username = username,
                Password = password
            });

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException(
                    $"Đăng nhập thử nghiệm thất bại ({(int)response.StatusCode}): {body}");
            }

            return client;
        }
    }
}
