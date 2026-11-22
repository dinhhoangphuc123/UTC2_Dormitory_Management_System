using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.IntegrationTests.Features.StudentPortal
{
    public class StudentPortalBedBookingTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public StudentPortalBedBookingTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task SubmitApplication_ReservesBed_AndBlocksSecondStudent()
        {
            using var context = _fixture.CreateDbContext();
            var service = CreateService(context);

            var lopId = await context.LopHocs.Select(l => l.MaLop).FirstAsync();
            var roundId = "DOT_K65_2026";

            var first = AddStudent(context, "TESTSV01", "Nguyễn Văn Test 01", lopId);
            var second = AddStudent(context, "TESTSV02", "Trần Văn Test 02", lopId);
            await context.SaveChangesAsync();

            var rooms = await service.GetRoomsForRoundAsync(first.MaSinhVien, roundId, "A01");
            var room = rooms.First(r => r.Selectable && r.Beds.Any(b => b.Selectable));
            var bed = room.Beds.First(b => b.Selectable);
            Assert.Null(bed.StudentName);
            Assert.Equal("Giường trống", bed.Status);

            var firstResult = await service.SubmitApplicationAsync(first.MaSinhVien, new SubmitApplicationRequestDto
            {
                MaDotDangKy = roundId,
                MaPhong = room.MaPhong,
                MaGiuong = bed.Id,
                AcceptRules = true
            });
            Assert.True(firstResult.Success, firstResult.ErrorMessage);

            var saved = await context.DonDangKys.AsNoTracking()
                .FirstAsync(d => d.MaSinhVien == first.MaSinhVien && d.MaDotDangKy == roundId);
            Assert.Equal(bed.Id, saved.MaGiuong);

            // Đơn chờ duyệt giữ giường và hiện tên sinh viên trên sơ đồ.
            var roomsAfter = await service.GetRoomsForRoundAsync(second.MaSinhVien, roundId, "A01");
            var heldBed = roomsAfter.First(r => r.MaPhong == room.MaPhong).Beds.First(b => b.Id == bed.Id);
            Assert.Equal("Đã đăng ký", heldBed.Status);
            Assert.Equal(first.HoTen, heldBed.StudentName);
            Assert.Equal(first.MaSinhVien, heldBed.Mssv);
            Assert.False(heldBed.Selectable);

            var secondResult = await service.SubmitApplicationAsync(second.MaSinhVien, new SubmitApplicationRequestDto
            {
                MaDotDangKy = roundId,
                MaPhong = room.MaPhong,
                MaGiuong = bed.Id,
                AcceptRules = true
            });
            Assert.False(secondResult.Success);
            Assert.Contains("giường", secondResult.ErrorMessage, StringComparison.OrdinalIgnoreCase);

            var secondCount = await context.DonDangKys
                .CountAsync(d => d.MaSinhVien == second.MaSinhVien && d.MaDotDangKy == roundId);
            Assert.Equal(0, secondCount);
        }

        private static StudentPortalService CreateService(Web.Data.ApplicationDbContext context)
        {
            return new StudentPortalService(
                context,
                new PasswordHasher(),
                Options.Create(new StudentPortalOptions()),
                Options.Create(new PaymentOptions()),
                new ReservationExpiryService(context, NullLogger<ReservationExpiryService>.Instance),
                NullLogger<StudentPortalService>.Instance);
        }

        private static SinhVien AddStudent(
            Web.Data.ApplicationDbContext context,
            string mssv,
            string hoTen,
            string lopId,
            string gioiTinh = "nam")
        {
            var student = new SinhVien
            {
                MaSinhVien = mssv,
                HoTen = hoTen,
                NgaySinh = new DateTime(2005, 1, 1),
                GioiTinh = gioiTinh,
                Cccd = "079205000000",
                MaLop = lopId,
                NamNhapHoc = 2023,
                TrangThai = "dangHoc"
            };
            context.SinhViens.Add(student);
            return student;
        }
    }
}
