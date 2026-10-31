using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Registrations.Services;

namespace Dormitory.Web.Features.Registrations
{
    public static class RegistrationsServiceRegistration
    {
        public static IServiceCollection AddRegistrationsServices(this IServiceCollection services)
        {
            services.AddScoped<IReservationExpiryService, ReservationExpiryService>();
            services.AddScoped<IDonDangKyService, DonDangKyService>();
            services.AddHostedService<ReservationExpiryBackgroundService>();
            return services;
        }
    }
}
