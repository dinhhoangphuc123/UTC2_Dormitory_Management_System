using Dormitory.Web.Features.Accounts.DTOs;

namespace Dormitory.Web.Features.Accounts.Services
{
    public interface IAuthService
    {
        Task<UserProfileDto?> LoginAsync(LoginRequestDto request);
        Task<UserProfileDto?> AuthenticateAsync(string username, string password);
        Task<UserProfileDto?> GetProfileAsync(string username);
    }
}
