using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Students.Services;

namespace Dormitory.Web.Features.Students
{
    public static class StudentServiceRegistration
    {
        public static IServiceCollection AddStudentServices(this IServiceCollection services)
        {
            services.AddScoped<ISinhVienService, SinhVienService>();
            return services;
        }
    }
}

