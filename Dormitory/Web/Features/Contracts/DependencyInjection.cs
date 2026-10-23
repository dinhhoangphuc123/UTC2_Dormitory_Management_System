using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Contracts.Services;

namespace Dormitory.Web.Features.Contracts
{
    public static class ContractsServiceRegistration
    {
        public static IServiceCollection AddContractsServices(this IServiceCollection services)
        {
            services.AddScoped<IHopDongService, HopDongService>();
            return services;
        }
    }
}

