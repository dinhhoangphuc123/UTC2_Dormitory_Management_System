using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;

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
                if (!await context.Database.CanConnectAsync())
                {
                    throw new InvalidOperationException(
                        "Không thể kết nối cơ sở dữ liệu. Hãy kiểm tra SQL Server và ConnectionStrings:DefaultConnection.");
                }
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "Không thể khởi tạo kết nối cơ sở dữ liệu SQL Server.");
                throw;
            }
        }
    }
}
