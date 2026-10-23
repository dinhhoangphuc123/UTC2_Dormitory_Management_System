using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Maintenance.Services;

namespace Dormitory.Web.Features.Maintenance
{
    public static class MaintenanceServiceRegistration
    {
        public static IServiceCollection AddMaintenanceServices(this IServiceCollection services)
        {
            services.AddScoped<IYeuCauSuaChuaService, YeuCauSuaChuaService>();
            return services;
        }
    }
}

