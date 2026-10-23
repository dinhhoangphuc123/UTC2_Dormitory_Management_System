using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Contracts.Services;

namespace Dormitory.IntegrationTests.Features.Contracts
{
    public class HopDongServiceTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public HopDongServiceTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAllContractsAsync_ReturnsExistingContracts()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HopDongService(context);

            var contracts = await service.GetAllContractsAsync();
            Assert.NotEmpty(contracts);
        }
    }
}

