using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Data.Seeding;

namespace Dormitory.Web.Shared.Extensions
{
    public static class DatabaseExtensions
    {
        public static IServiceCollection AddDormitoryDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<ApplicationDbContext>(options =>
            {
                if (!string.IsNullOrWhiteSpace(connectionString))
                {
                    try
                    {
                        options.UseSqlServer(connectionString, sqlOptions =>
                        {
                            sqlOptions.CommandTimeout(30);
                        });
                    }
                    catch
                    {
                        options.UseInMemoryDatabase("FallbackKtxDb");
                    }
                }
                else
                {
                    options.UseInMemoryDatabase("FallbackKtxDb");
                }
            });

            return services;
        }

        public static async Task InitializeDormitoryDatabaseAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var services = scope.ServiceProvider;
            try
            {
                var context = services.GetRequiredService<ApplicationDbContext>();
                await DbSeeder.SeedAllAsync(context);
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogWarning(ex, "Không thể kết nối SQL Server, hệ thống sẽ sử dụng bộ nhớ tạm để phục vụ giao diện.");
            }
        }
    }
}

