using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Dormitory.Web.Data;
using Dormitory.Web.Data.Seeding;

namespace Dormitory.IntegrationTests.Support
{
    public class SqlServerFixture : IDisposable
    {
        // Năm học được ReferenceDataSeeder nạp sẵn cho mọi test tích hợp.
        public const string AcademicYear = "NH2026-2027";

        public ApplicationDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: $"KtxIntegrationDb_{Guid.NewGuid()}")
                // Các luồng thu tiền chạy trong transaction; InMemory không có transaction thật
                // nên bỏ qua cảnh báo này để test đi đúng nhánh code như trên SQL Server.
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            var context = new ApplicationDbContext(options);
            DbSeeder.SeedAllAsync(context).GetAwaiter().GetResult();
            DemoDataSeeder.SeedAsync(context).GetAwaiter().GetResult();
            return context;
        }

        public void Dispose()
        {
        }
    }
}

