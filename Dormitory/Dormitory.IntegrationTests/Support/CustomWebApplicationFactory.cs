using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Data;
using Dormitory.Web.Data.Seeding;

namespace Dormitory.IntegrationTests.Support
{
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        private static readonly IServiceProvider InternalServiceProvider =
            new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Remove SqlServer DbContext registrations from Program, otherwise both
                // SqlServer and InMemory providers end up in the same internal provider.
                var toRemove = services
                    .Where(d =>
                        d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                        d.ServiceType.FullName != null &&
                            d.ServiceType.FullName.Contains("DbContextOptions", StringComparison.Ordinal))
                    .ToList();
                foreach (var descriptor in toRemove)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInternalServiceProvider(InternalServiceProvider);
                    options.UseInMemoryDatabase("KtxIntegrationTestsDb");
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var scopedServices = scope.ServiceProvider;
                var db = scopedServices.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();
                // Nạp cả dữ liệu demo để test đăng nhập và các luồng nghiệp vụ có sẵn tài khoản.
                DbSeeder.SeedAsync(db).GetAwaiter().GetResult();
            });
        }
    }
}
