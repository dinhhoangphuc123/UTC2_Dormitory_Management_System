using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Rooms.Services;

namespace Dormitory.Web.Features.Rooms
{
    public static class RoomsServiceRegistration
    {
        public static IServiceCollection AddRoomsServices(this IServiceCollection services)
        {
            services.AddScoped<IPhongService, PhongService>();
            return services;
        }
    }
}

