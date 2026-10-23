using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Accounts.Services;

namespace Dormitory.Web.Features.Accounts
{
    public static class AccountsServiceRegistration
    {
        public static IServiceCollection AddAccountsServices(this IServiceCollection services)
        {
            services.AddScoped<IPasswordHasher, PasswordHasher>();
            services.AddScoped<IAuthService, AuthService>();
            return services;
        }
    }
}
