using Dormitory.IntegrationTests.Support;

namespace Dormitory.IntegrationTests.Data
{
    public class MigrationTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public MigrationTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public void DatabaseSchema_InitializesSuccessfully()
        {
            using var context = _fixture.CreateDbContext();
            Assert.True(context.VaiTros.Any());
            Assert.True(context.ToaNhas.Any());
            Assert.True(context.Phongs.Any());
            Assert.True(context.SinhViens.Any());
        }
    }
}

