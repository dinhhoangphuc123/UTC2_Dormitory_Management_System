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

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "ConnectionStrings:DefaultConnection chưa được cấu hình.");
            }

            // Kết nối trực tiếp SQL Server, không sử dụng Mock / InMemory
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.CommandTimeout(60);
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorNumbersToAdd: null);
                });
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

                if (context.Database.IsRelational())
                {
                    try
                    {
                        await context.Database.MigrateAsync();
                    }
                    catch (Exception migEx)
                    {
                        var migLogger = services.GetRequiredService<ILogger<Program>>();
                        migLogger.LogError(migEx, "Migration thất bại: {Message}. Vui lòng kiểm tra schema DB.", migEx.Message);
                    }
                }
                else
                {
                    // Provider InMemory (dùng trong test) không hỗ trợ migration.
                    await context.Database.EnsureCreatedAsync();
                }

                await DbSeeder.SeedAsync(context, app.Environment);
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "Không thể khởi tạo cơ sở dữ liệu.");
                throw;
            }
        }
    }
}
