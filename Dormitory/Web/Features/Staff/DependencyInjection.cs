using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Staff.Services;

namespace Dormitory.Web.Features.Staff
{
    public static class StaffServiceRegistration
    {
        public static IServiceCollection AddStaffServices(this IServiceCollection services)
        {
            services.AddScoped<INhanVienService, NhanVienService>();
            return services;
        }
    }
}

