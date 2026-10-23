using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Payments.Services;

namespace Dormitory.Web.Features.Payments
{
    public static class PaymentsServiceRegistration
    {
        public static IServiceCollection AddPaymentsServices(this IServiceCollection services)
        {
            services.AddScoped<IThanhToanService, ThanhToanService>();
            return services;
        }
    }
}

