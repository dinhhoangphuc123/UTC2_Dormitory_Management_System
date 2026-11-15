using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Dormitory.Web.Data.Seeding
{
    public static class DbSeeder
    {
        public static async Task SeedAllAsync(ApplicationDbContext context)
        {
            await RoleSeeder.SeedAsync(context);
            await ReferenceDataSeeder.SeedAsync(context);
        }

        public static async Task SeedAsync(ApplicationDbContext context, IWebHostEnvironment? env = null)
        {
            await RoleSeeder.SeedAsync(context);
            await ReferenceDataSeeder.SeedAsync(context);

            // Dữ liệu demo chỉ được nạp ngoài môi trường production.
            if (env == null || env.IsDevelopment() || env.IsEnvironment("Testing"))
            {
                await DemoDataSeeder.SeedAsync(context);
            }
        }
    }
}

