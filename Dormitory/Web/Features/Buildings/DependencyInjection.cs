using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Buildings.Services;

namespace Dormitory.Web.Features.Buildings
{
    public static class BuildingsServiceRegistration
    {
        public static IServiceCollection AddBuildingsServices(this IServiceCollection services)
        {
            services.AddScoped<IToaNhaService, ToaNhaService>();
            return services;
        }
    }
}

