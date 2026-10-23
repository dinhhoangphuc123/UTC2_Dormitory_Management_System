using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Data.Seeding;

namespace Dormitory.IntegrationTests.Support
{
    public class SqlServerFixture : IDisposable
    {
        public ApplicationDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: $"KtxIntegrationDb_{Guid.NewGuid()}")
                .Options;

            var context = new ApplicationDbContext(options);
            DbSeeder.SeedAllAsync(context).GetAwaiter().GetResult();
            return context;
        }

        public void Dispose()
        {
        }
    }
}

