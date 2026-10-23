using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Utilities.Services;

namespace Dormitory.Web.Features.Utilities
{
    public static class UtilitiesServiceRegistration
    {
        public static IServiceCollection AddUtilitiesServices(this IServiceCollection services)
        {
            services.AddScoped<IDienNuocDichVuService, DienNuocDichVuService>();
            return services;
        }
    }
}

