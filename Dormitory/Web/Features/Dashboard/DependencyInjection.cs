using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Dashboard.Services;

namespace Dormitory.Web.Features.Dashboard
{
    public static class DashboardServiceRegistration
    {
        public static IServiceCollection AddDashboardServices(this IServiceCollection services)
        {
            services.AddScoped<IDashboardService, DashboardService>();
            return services;
        }
    }
}

