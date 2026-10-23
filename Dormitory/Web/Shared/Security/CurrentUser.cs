using System.Security.Claims;

namespace Dormitory.Web.Shared.Security
{
    public interface ICurrentUser
    {
        string? Username { get; }
        string? Role { get; }
        string? StaffId { get; }
        string? StudentId { get; }
        bool IsAuthenticated { get; }
    }

    public class CurrentUser : ICurrentUser
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUser(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

        public string? Username => User?.Identity?.Name ?? User?.FindFirst(ClaimTypes.Name)?.Value;
        public string? Role => User?.FindFirst(ClaimTypes.Role)?.Value;
        public string? StaffId => User?.FindFirst("StaffId")?.Value;
        public string? StudentId => User?.FindFirst("StudentId")?.Value;
        public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
    }
}

