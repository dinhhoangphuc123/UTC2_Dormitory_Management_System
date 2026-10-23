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
            await DemoDataSeeder.SeedAsync(context);
        }

        public static async Task SeedAsync(ApplicationDbContext context, IWebHostEnvironment? env = null)
        {
            await RoleSeeder.SeedAsync(context);
            await ReferenceDataSeeder.SeedAsync(context);
            if (env == null || env.IsDevelopment())
            {
                await DemoDataSeeder.SeedAsync(context);
            }
        }
    }
}

