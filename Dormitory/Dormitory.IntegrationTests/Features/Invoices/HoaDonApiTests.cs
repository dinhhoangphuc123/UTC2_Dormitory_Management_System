using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Invoices.Api;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Invoices
{
    public class HoaDonApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public HoaDonApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsInvoices()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HoaDonService(context);
            var controller = new HoaDonApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<InvoiceItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

