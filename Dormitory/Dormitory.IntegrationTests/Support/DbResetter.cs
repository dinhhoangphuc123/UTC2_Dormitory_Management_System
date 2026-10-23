using Dormitory.Web.Data;
using Dormitory.Web.Data.Seeding;

namespace Dormitory.IntegrationTests.Support
{
    public static class DbResetter
    {
        public static async Task ResetAsync(ApplicationDbContext context)
        {
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
            await DbSeeder.SeedAllAsync(context);
        }
    }
}

