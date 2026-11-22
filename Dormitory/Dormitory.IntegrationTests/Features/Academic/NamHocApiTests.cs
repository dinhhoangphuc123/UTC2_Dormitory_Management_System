using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Academic.Api;

namespace Dormitory.IntegrationTests.Features.Academic
{
    public class NamHocApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public NamHocApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        private static CreateNamHocRequest Request(string code, DateTime start, DateTime end, bool active = true) => new()
        {
            MaNamHoc = code,
            NgayBatDau = start,
            NgayKetThuc = end,
            LaDangHoat = active
        };

        private static string MessageOf(IActionResult result)
        {
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            var messageProperty = bad.Value!.GetType().GetProperty("message");
            Assert.NotNull(messageProperty);
            return (string)messageProperty!.GetValue(bad.Value)!;
        }

        private static string CodeOf(IActionResult result)
        {
            var ok = Assert.IsType<OkObjectResult>(result);
            var codeProperty = ok.Value!.GetType().GetProperty("MaNamHoc");
            Assert.NotNull(codeProperty);
            return (string)codeProperty!.GetValue(ok.Value)!;
        }

        [Theory]
        [InlineData("abc")]
        [InlineData("2026-2027")]
        [InlineData("NH2026_2027")]
        [InlineData("NH26-27")]
        [InlineData("NH2026-20277")]
        [InlineData("NH2026")]
        public async Task CreateYear_RejectsCodeWithWrongFormat(string code)
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request(code, new DateTime(2030, 1, 1), new DateTime(2030, 12, 31)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("định dạng", MessageOf(result));
        }

        [Fact]
        public async Task CreateYear_RejectsNonConsecutiveYears()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request("NH2030-2035", new DateTime(2030, 9, 1), new DateTime(2035, 6, 30)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("Năm kết thúc", MessageOf(result));
        }

        [Fact]
        public async Task CreateYear_RejectsDatesThatDoNotMatchCode()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request("NH2031-2032", new DateTime(2030, 9, 1), new DateTime(2032, 6, 30)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("NH2031-2032", MessageOf(result));
        }

        [Fact]
        public async Task CreateYear_RejectsDuplicateCode()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request(SqlServerFixture.AcademicYear, new DateTime(2026, 9, 1), new DateTime(2027, 6, 30)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("đã tồn tại", MessageOf(result));
        }

        [Fact]
        public async Task CreateYear_RejectsDuplicateCodeIgnoringCase()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request("nh2026-2027", new DateTime(2026, 9, 1), new DateTime(2027, 6, 30)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("đã tồn tại", MessageOf(result));
        }

        [Fact]
        public async Task CreateYear_RejectsOverlappingPeriod()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            // NH2026-2027 kết thúc 30/06/2027 nên năm mới không được bắt đầu trong khoảng đang diễn ra.
            var result = await controller.CreateYear(Request("NH2027-2028", new DateTime(2027, 1, 1), new DateTime(2028, 6, 30)));

            Assert.IsType<BadRequestObjectResult>(result);
            var message = MessageOf(result);
            Assert.Contains("trùng", message);
            Assert.Contains(SqlServerFixture.AcademicYear, message);
            Assert.False(context.NamHocs.Any(n => n.MaNamHoc == "NH2027-2028"));
        }

        [Fact]
        public async Task CreateYear_AcceptsPeriodRightAfterPreviousYear()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request("nh2027-2028", new DateTime(2027, 7, 1), new DateTime(2028, 6, 30)));

            Assert.Equal("NH2027-2028", CodeOf(result));
            Assert.True(context.NamHocs.Any(n => n.MaNamHoc == "NH2027-2028"));
            Assert.True(context.KyHocs.Any(k => k.MaNamHoc == "NH2027-2028"));
        }

        [Fact]
        public async Task CreateYear_ReturnedPayloadHasNoReferenceCycle()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.CreateYear(Request("NH2027-2028", new DateTime(2027, 7, 1), new DateTime(2028, 6, 30)));

            var ok = Assert.IsType<OkObjectResult>(result);
            // Trước đây trả thẳng entity NamHoc nên response 500 (vòng tham chiếu NamHoc <-> KyHoc)
            // dù dữ liệu đã được ghi, khiến người dùng thấy "thất bại" nhưng năm học vẫn xuất hiện.
            var json = JsonSerializer.Serialize(ok.Value);
            Assert.Contains("NH2027-2028", json);
        }

        [Fact]
        public async Task CreateYear_DeactivatesOtherActiveYears()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            await controller.CreateYear(Request("NH2027-2028", new DateTime(2027, 7, 1), new DateTime(2028, 6, 30)));

            var previous = context.NamHocs.Single(n => n.MaNamHoc == SqlServerFixture.AcademicYear);
            Assert.False(previous.LaDangHoat);
        }

        [Fact]
        public async Task UpdateYear_ChangesDates()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.UpdateYear(
                SqlServerFixture.AcademicYear,
                Request(SqlServerFixture.AcademicYear, new DateTime(2026, 8, 1), new DateTime(2027, 5, 31)));

            Assert.Equal(SqlServerFixture.AcademicYear, CodeOf(result));
            var year = context.NamHocs.Single(n => n.MaNamHoc == SqlServerFixture.AcademicYear);
            Assert.Equal(new DateTime(2026, 8, 1), year.NgayBatDau);
            Assert.Equal(new DateTime(2027, 5, 31), year.NgayKetThuc);
        }

        [Fact]
        public async Task UpdateYear_RenamesCodeAndKeepsPeriods()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);
            var periodCountBefore = context.KyHocs.Count(k => k.MaNamHoc == SqlServerFixture.AcademicYear);

            var result = await controller.UpdateYear(
                SqlServerFixture.AcademicYear,
                Request(SqlServerFixture.AcademicYear, new DateTime(2026, 9, 1), new DateTime(2027, 6, 30)));

            // Mã không đổi -> chỉ cập nhật, không nhân bản kỳ học.
            Assert.Equal(SqlServerFixture.AcademicYear, CodeOf(result));
            Assert.Equal(periodCountBefore, context.KyHocs.Count(k => k.MaNamHoc == SqlServerFixture.AcademicYear));
        }

        [Fact]
        public async Task UpdateYear_RejectsOverlapWithOtherYear()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);
            await controller.CreateYear(Request("NH2027-2028", new DateTime(2027, 7, 1), new DateTime(2028, 6, 30)));

            // Kéo dài NH2026-2027 tới 31/12/2027 sẽ chồng lên NH2027-2028.
            var result = await controller.UpdateYear(
                SqlServerFixture.AcademicYear,
                Request(SqlServerFixture.AcademicYear, new DateTime(2026, 9, 1), new DateTime(2027, 12, 31)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("trùng", MessageOf(result));
        }

        [Fact]
        public async Task UpdateYear_RejectsDuplicateCode()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);
            await controller.CreateYear(Request("NH2027-2028", new DateTime(2027, 7, 1), new DateTime(2028, 6, 30)));

            var result = await controller.UpdateYear(
                SqlServerFixture.AcademicYear,
                Request("NH2027-2028", new DateTime(2027, 7, 1), new DateTime(2028, 6, 30)));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("đã tồn tại", MessageOf(result));
        }

        [Fact]
        public async Task UpdateYear_ReturnsNotFoundForUnknownCode()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new NamHocApiController(context);

            var result = await controller.UpdateYear("NH2099-2100", Request("NH2099-2100", new DateTime(2099, 9, 1), new DateTime(2100, 6, 30)));

            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}
