using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.StudentPortal.Services;

namespace Dormitory.Web.Features.StudentPortal
{
    public static class StudentPortalServiceRegistration
    {
        public static IServiceCollection AddStudentPortalServices(this IServiceCollection services)
        {
            services.AddScoped<IStudentPortalService, StudentPortalService>();
            return services;
        }
    }
}
