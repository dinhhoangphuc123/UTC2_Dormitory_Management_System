using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Maintenance.Api;
using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Maintenance
{
    public class SuaChuaApiTests : IClassFixture<SqlServerFixture>, IDisposable
    {
        private readonly SqlServerFixture _fixture;
        private readonly TestWebHostEnvironment _env = new();

        public SuaChuaApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        public void Dispose()
        {
            if (Directory.Exists(_env.ContentRootPath))
            {
                Directory.Delete(_env.ContentRootPath, true);
            }
        }

        private SuaChuaApiController CreateController(YeuCauSuaChuaService service)
        {
            var controller = new SuaChuaApiController(service, _env);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            controller.Request.QueryString = new QueryString($"?academicYear={SqlServerFixture.AcademicYear}");
            return controller;
        }

        [Fact]
        public async Task GetAll_ReturnsTickets()
        {
            using var context = _fixture.CreateDbContext();
            var controller = CreateController(new YeuCauSuaChuaService(context));

            var result = await controller.GetAll(null, null, null, null, null, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<MaintenanceTicketDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }

        [Fact]
        public async Task Create_CoAnh_LuuAnhVaDanhDauHasImage()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await context.HopDongs
                .Include(h => h.KyHoc)
                .Include(h => h.Giuong)
                .FirstAsync(h => h.TrangThai == "hieuLuc" &&
                    h.KyHoc!.MaNamHoc == SqlServerFixture.AcademicYear &&
                    h.NgayBatDau <= DateTime.Today &&
                    h.NgayKetThuc >= DateTime.Today &&
                    h.Giuong != null);
            var controller = CreateController(new YeuCauSuaChuaService(context));

            var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02 };
            var image = new FormFile(new MemoryStream(bytes), 0, bytes.Length, "image", "broken.png");

            var result = await controller.Create(
                new CreateTicketDto { StudentId = contract.MaSinhVien, Description = "Bàn học bị gãy chân, kèm ảnh chụp" },
                image);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<MaintenanceTicketDto>>(ok.Value);
            Assert.True(res.Success);
            Assert.True(res.Data!.HasImage);

            var stored = await context.YeuCauSuaChuas.SingleAsync(y => y.MaYeuCau == int.Parse(res.Data.Id));
            Assert.False(string.IsNullOrEmpty(stored.AnhMinhHoa));
            Assert.True(File.Exists(Path.Combine(_env.ContentRootPath, "App_Data", "maintenance", stored.AnhMinhHoa!)));

            var imageResult = await controller.GetImage(res.Data.Id, SqlServerFixture.AcademicYear);
            var fileResult = Assert.IsType<FileContentResult>(imageResult);
            Assert.Equal(bytes, fileResult.FileContents);
            Assert.Equal("image/png", fileResult.ContentType);
        }

        [Fact]
        public async Task Create_AnhSaiDinhDang_TraBadRequest()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await context.HopDongs
                .Include(h => h.KyHoc)
                .Include(h => h.Giuong)
                .FirstAsync(h => h.TrangThai == "hieuLuc" &&
                    h.KyHoc!.MaNamHoc == SqlServerFixture.AcademicYear &&
                    h.NgayBatDau <= DateTime.Today &&
                    h.NgayKetThuc >= DateTime.Today &&
                    h.Giuong != null);
            var controller = CreateController(new YeuCauSuaChuaService(context));
            var ticketCount = context.YeuCauSuaChuas.Count();

            var bytes = new byte[] { 0x01, 0x02, 0x03 };
            var image = new FormFile(new MemoryStream(bytes), 0, bytes.Length, "image", "broken.txt");
            var result = await controller.Create(
                new CreateTicketDto { StudentId = contract.MaSinhVien, Description = "Thiết bị hỏng" },
                image);

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(ticketCount, context.YeuCauSuaChuas.Count());
        }

        [Fact]
        public async Task Complete_Ok_CapNhatHoanThanhVaLuuPhanHoi()
        {
            using var context = _fixture.CreateDbContext();
            var year = context.NamHocs.Single(n => n.MaNamHoc == SqlServerFixture.AcademicYear);
            var ticket = context.YeuCauSuaChuas.First(y => y.TrangThai == "dangXuLy" &&
                y.NgayGui >= year.NgayBatDau && y.NgayGui < year.NgayKetThuc.Date.AddDays(1));
            var controller = CreateController(new YeuCauSuaChuaService(context));

            var result = await controller.Complete(ticket.MaYeuCau.ToString(),
                new CompleteTicketDto { PhanHoi = "Đã thay linh kiện mới" }, SqlServerFixture.AcademicYear);

            Assert.IsType<OkObjectResult>(result);
            var updated = await context.YeuCauSuaChuas.FindAsync(ticket.MaYeuCau);
            Assert.Equal("hoanThanh", updated!.TrangThai);
            Assert.NotNull(updated.NgayHoanThanh);
            Assert.Equal("Đã thay linh kiện mới", updated.PhanHoi);
        }

        [Fact]
        public async Task Complete_ThieuNamHocHoacSaiPhieu_TraNotFound()
        {
            using var context = _fixture.CreateDbContext();
            var ticket = context.YeuCauSuaChuas.First(y => y.TrangThai == "dangXuLy");
            var controller = CreateController(new YeuCauSuaChuaService(context));

            var missingYear = await controller.Complete(ticket.MaYeuCau.ToString(), new CompleteTicketDto { PhanHoi = "Xong" }, null);
            Assert.IsType<NotFoundObjectResult>(missingYear);

            var unknownTicket = await controller.Complete("999999", new CompleteTicketDto { PhanHoi = "Xong" }, SqlServerFixture.AcademicYear);
            Assert.IsType<NotFoundObjectResult>(unknownTicket);
        }

        private sealed class TestWebHostEnvironment : IWebHostEnvironment
        {
            public string EnvironmentName { get; set; } = "Development";
            public string ApplicationName { get; set; } = "Dormitory.IntegrationTests";
            public string WebRootPath { get; set; } = string.Empty;
            public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
            public string ContentRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "ktx-maintenance-tests", Guid.NewGuid().ToString("N"));
            public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        }
    }
}
