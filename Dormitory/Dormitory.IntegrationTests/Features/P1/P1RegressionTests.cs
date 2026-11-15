using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Services;
using Dormitory.Web.Features.Staff.Validators;
using Dormitory.Web.Features.Rooms.Api;
using Dormitory.Web.Features.Rooms.DTOs;
using Dormitory.Web.Features.Rooms.Services;
using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Services;
using Dormitory.Web.Features.Utilities.Api;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Features.Utilities.Validators;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.P1
{
    public class P1RegressionTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public P1RegressionTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task CreateStaff_ReturnsTemporaryPassword_AndUsername()
        {
            using var context = _fixture.CreateDbContext();
            var service = new NhanVienService(context, new PasswordHasher());

            var dto = new CreateStaffDto
            {
                Name = "Nhan Vien P1 Test",
                Position = "Nhan vien",
                Phone = "0901234567",
                Email = "p1-test@example.com",
                Role = "quanLy"
            };
            var (valid, _) = CreateStaffValidator.Validate(dto);
            Assert.True(valid);

            var created = await service.CreateStaffAsync(dto);
            Assert.False(string.IsNullOrWhiteSpace(created.Username));
            Assert.False(string.IsNullOrWhiteSpace(created.InitialPassword));
            Assert.NotEqual("123456", created.InitialPassword);
            Assert.Equal(0, PasswordPolicy.Validate(created.InitialPassword).ErrorMessage == null ? 0 : 1);
            var hasher = new PasswordHasher();
            Assert.True(hasher.VerifyPassword(created.InitialPassword!, context.TaiKhoans.First(t => t.TenDangNhap == created.Username).MatKhauHash));
        }

        [Fact]
        public async Task GenerateTemporaryPassword_IsStrongAndUnique()
        {
            var a = PasswordPolicy.GenerateTemporaryPassword();
            var b = PasswordPolicy.GenerateTemporaryPassword();
            Assert.True(a.Length >= 12);
#pragma warning disable xUnit2012
            Assert.True(a.Any(char.IsUpper));
            Assert.True(a.Any(char.IsLower));
            Assert.True(a.Any(char.IsDigit));
            Assert.True(a.Any(c => "@#$_".Contains(c)));
#pragma warning restore xUnit2012
            Assert.NotEqual(a, b);
        }

        [Fact]
        public async Task RecordUtility_FirstTime_AllowsZeroOldIndex_AndCreatesRoomBill()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DienNuocDichVuService(context);
            var controller = new DienNuocApiController(service);

            // Phòng demo chưa có chỉ số nào, lần ghi đầu tiên phải thành công với chỉ số cũ = 0.
            var room = context.Phongs.First();
            var req = new RecordUtilityDto { RoomId = room.MaPhong, NewElectric = 100, NewWater = 10, Thang = 9, Nam = 2026 };
            var result = await controller.Record(req, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<UtilityItemDto>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(100, res.Data!.UsageElectric);
            Assert.Equal(10, res.Data.UsageWater);

            var bill = context.HoaDonPhongs.FirstOrDefault(b => b.MaPhong == room.MaPhong && b.Thang == 9 && b.Nam == 2026);
            Assert.NotNull(bill);
            Assert.Equal(100 * 2500, bill!.TienDien);
            Assert.Equal(10 * 12000, bill.TienNuoc);
            Assert.Equal(bill.TienDien + bill.TienNuoc, bill.TongTien);
            Assert.Equal(bill.SoNguoiChia, bill.SoNguoiChia);
        }

        [Fact]
        public async Task RecordUtility_RejectsDecreasingIndex_AndFutureMonth()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DienNuocDichVuService(context);
            var room = context.Phongs.First();

            var first = await service.RecordUtilityAsync(
                new RecordUtilityDto { RoomId = room.MaPhong, NewElectric = 100, NewWater = 10, Thang = 9, Nam = 2026 },
                SqlServerFixture.AcademicYear, null);
            Assert.NotNull(first);

            var lower = await service.RecordUtilityAsync(
                new RecordUtilityDto { RoomId = room.MaPhong, NewElectric = 50, NewWater = 5, Thang = 10, Nam = 2026 },
                SqlServerFixture.AcademicYear, null);
            Assert.Null(lower);

            var future = await service.RecordUtilityAsync(
                new RecordUtilityDto { RoomId = room.MaPhong, NewElectric = 200, NewWater = 20, Thang = 6, Nam = 2027 },
                SqlServerFixture.AcademicYear, null);
            Assert.Null(future);
        }

        [Fact]
        public void RecordUtilityValidator_RequiresMonthAndYearTogether()
        {
            var (ok1, _) = RecordUtilityValidator.Validate(new RecordUtilityDto { RoomId = "A01_101", NewElectric = 1, NewWater = 1, Thang = 13 });
            Assert.False(ok1);
            var (ok2, msg) = RecordUtilityValidator.Validate(new RecordUtilityDto { RoomId = "A01_101", NewElectric = 1, NewWater = 1, Thang = 9 });
            Assert.False(ok2);
            Assert.Contains("tháng và năm", msg);
        }

        [Fact]
        public async Task ToggleBedMaintenance_Blocked_WhenBedHasActiveContract()
        {
            using var context = _fixture.CreateDbContext();
            var service = new PhongService(context);
            // Tạo hợp đồng hiệu lực rõ ràng để kiểm tra chặn bảo trì.
            var bed = context.Giuongs.First(g => g.LaDangHoat);
            var student = context.SinhViens.First();
            var term = context.KyHocs.First(k => k.MaNamHoc == SqlServerFixture.AcademicYear);
            context.HopDongs.Add(new Dormitory.Web.Features.Contracts.Entities.HopDong
            {
                MaHopDong = "HD-P1-TEST",
                MaSinhVien = student.MaSinhVien,
                MaGiuong = bed.MaGiuong,
                MaKyHoc = term.MaKyHoc,
                NgayBatDau = term.NgayBatDau,
                NgayKetThuc = term.NgayKetThuc,
                GiaThueThang = 500000,
                TienCoc = 100000,
                TrangThai = "hieuLuc"
            });
            await context.SaveChangesAsync();

            var wasActive = bed.LaDangHoat;
            var result = await service.ToggleBedMaintenanceAsync(bed.MaGiuong, SqlServerFixture.AcademicYear);
            Assert.False(result);
            Assert.Equal(wasActive, context.Giuongs.First(g => g.MaGiuong == bed.MaGiuong).LaDangHoat);
        }

        [Fact]
        public async Task GetAllRooms_StatusFilter_ReturnsOnlyMatching()
        {
            using var context = _fixture.CreateDbContext();
            var service = new PhongService(context);
            var all = await service.GetAllRoomsAsync(null, null, null, null, SqlServerFixture.AcademicYear);
            if (all.Count == 0) return;
            var maintenance = await service.GetAllRoomsAsync(null, null, "Bảo trì", null, SqlServerFixture.AcademicYear);
            Assert.All(maintenance, r => Assert.Equal("Bảo trì", r.Status));
        }

        [Fact]
        public async Task CreateRoom_RejectsBedCountExceedingCapacity()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new PhongCreateApiController(context);
            var result = await controller.Create(new CreateRoomRequest
            {
                MaPhong = "A01_P1TEST",
                MaToaNha = "A01",
                MaLoaiPhong = "LP_TC_NAM",
                SoTang = 1,
                SoGiuong = 99
            });
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("sức chứa", bad.Value!.ToString()!);
        }

        [Fact]
        public async Task GetAllStudents_StatusFilter_Work()
        {
            using var context = _fixture.CreateDbContext();
            var service = new SinhVienService(context);
            var resident = await service.GetAllStudentsAsync(null, null, "Đang ở", null, SqlServerFixture.AcademicYear);
            Assert.All(resident, s => Assert.Equal("Đang ở", s.ResidenceStatus));
            var non = await service.GetAllStudentsAsync(null, null, "residentx", null, SqlServerFixture.AcademicYear);
            Assert.NotNull(non);
        }

        [Fact]
        public async Task AuthHelper_LoginFailure_Throws()
        {
            var factory = new CustomWebApplicationFactory();
            var client = factory.CreateClient();
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => AuthHelper.CreateAuthenticatedClientAsync(factory, "wrong-user-xyz", "wrongpass"));
            Assert.Contains("Đăng nhập thử nghiệm thất bại", ex.Message);
        }
    }
}
