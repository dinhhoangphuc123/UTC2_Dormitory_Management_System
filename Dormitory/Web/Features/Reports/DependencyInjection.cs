using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Reports.Services;

namespace Dormitory.Web.Features.Reports
{
    public static class ReportsServiceRegistration
    {
        public static IServiceCollection AddReportsServices(this IServiceCollection services)
        {
            services.AddScoped<IBaoCaoService, BaoCaoService>();
            return services;
        }
    }
}

