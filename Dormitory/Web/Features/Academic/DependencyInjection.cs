using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Academic.Services;

namespace Dormitory.Web.Features.Academic
{
    public static class AcademicServiceRegistration
    {
        public static IServiceCollection AddAcademicServices(this IServiceCollection services)
        {
            services.AddScoped<ILopHocService, LopHocService>();
            return services;
        }
    }
}

