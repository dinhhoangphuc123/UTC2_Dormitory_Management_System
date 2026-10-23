using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Violations.Services;

namespace Dormitory.Web.Features.Violations
{
    public static class ViolationsServiceRegistration
    {
        public static IServiceCollection AddViolationsServices(this IServiceCollection services)
        {
            services.AddScoped<IViPhamService, ViPhamService>();
            return services;
        }
    }
}

