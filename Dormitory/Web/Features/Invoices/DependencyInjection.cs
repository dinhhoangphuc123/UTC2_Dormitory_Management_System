using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Invoices.Services;

namespace Dormitory.Web.Features.Invoices
{
    public static class InvoicesServiceRegistration
    {
        public static IServiceCollection AddInvoicesServices(this IServiceCollection services)
        {
            services.AddScoped<IHoaDonService, HoaDonService>();
            return services;
        }
    }
}

