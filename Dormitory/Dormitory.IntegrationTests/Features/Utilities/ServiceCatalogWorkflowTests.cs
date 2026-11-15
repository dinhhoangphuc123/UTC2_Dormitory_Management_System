using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.StudentPortal.Api;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Utilities.Api;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.IntegrationTests.Features.Utilities
{
    // Nghiệp vụ dịch vụ: CRUD danh mục, đơn đăng ký của sinh viên, duyệt/từ chối của BQL
    // và checkbox dịch vụ trong form ghi chỉ số điện nước.
    public class ServiceCatalogWorkflowTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public ServiceCatalogWorkflowTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        private sealed class FakeCurrentUser : ICurrentUser
        {
            public string? Username => "test";
            public string? Role { get; init; }
            public string? StaffId { get; init; }
            public string? StudentId { get; init; }
            public bool IsAuthenticated => true;
        }

        private const int RecMonth = 10;
        private const int RecYear = 2026;

        // Phòng mới với N hợp đồng hiệu lực (không đụng dữ liệu demo).
        private static async Task<(Phong Phong, List<HopDong> Contracts)> BuildRoomAsync(
            ApplicationDbContext context, string tag, int soNguoi)
        {
            var building = await context.ToaNhas.FirstAsync();
            var loaiPhong = await context.LoaiPhongs.FirstAsync();
            var phong = new Phong
            {
                MaPhong = $"A9_S{tag}",
                MaToaNha = building.MaToaNha,
                MaLoaiPhong = loaiPhong.MaLoaiPhong,
                SoTang = 1
            };
            context.Phongs.Add(phong);

            var contracts = new List<HopDong>();
            for (int i = 1; i <= soNguoi; i++)
            {
                var giuong = new Giuong { MaGiuong = $"{phong.MaPhong}_{i}", MaPhong = phong.MaPhong, SoThuTu = i };
                context.Giuongs.Add(giuong);
                var sv = await TestDataBuilder.CreateTestStudentAsync(context, $"SV{tag}{i:D3}");
                var hopDong = new HopDong
                {
                    MaHopDong = $"HDS{tag}{i}",
                    MaSinhVien = sv.MaSinhVien,
                    MaGiuong = giuong.MaGiuong,
                    MaKyHoc = "HK1_2026_2027",
                    NgayBatDau = new DateTime(2026, 9, 1),
                    NgayKetThuc = new DateTime(2027, 5, 31),
                    GiaThueThang = 500000,
                    TrangThai = "hieuLuc"
                };
                context.HopDongs.Add(hopDong);
                contracts.Add(hopDong);
            }

            await context.SaveChangesAsync();
            return (phong, contracts);
        }

        // ============ CRUD danh mục dịch vụ ============

        [Fact]
        public async Task CreateService_Ok_AppearsInCatalog()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);

            var (success, error, data) = await service.CreateServiceAsync(
                new SaveServiceDto { Name = "Giặt sấy tự động", Unit = "lan", Price = 15000 });

            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(data);
            Assert.StartsWith("DV_", data!.Id);

            var catalog = await service.GetCatalogAsync();
            var item = catalog.Single(s => s.Id == data.Id);
            Assert.Equal("Giặt sấy tự động", item.Name);
            Assert.Equal(15000m, item.Price);
            Assert.True(item.IsActive);
        }

        [Fact]
        public async Task CreateService_BlankName_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);

            var (success, error, data) = await service.CreateServiceAsync(
                new SaveServiceDto { Name = "   ", Unit = "thang", Price = 10000 });

            Assert.False(success);
            Assert.Equal("Tên dịch vụ không được để trống.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task UpdateService_Ok_ChangesPriceAndStatus()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, _, created) = await service.CreateServiceAsync(
                new SaveServiceDto { Name = "Dịch vụ tạm", Unit = "thang", Price = 20000 });

            var (success, error, updated) = await service.UpdateServiceAsync(created!.Id,
                new SaveServiceDto { Name = "Dịch vụ tạm", Unit = "thang", Price = 35000, IsActive = false });

            Assert.True(success);
            Assert.Null(error);
            Assert.Equal(35000m, updated!.Price);
            Assert.False(updated.IsActive);
        }

        [Fact]
        public async Task UpdateService_NotFound_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);

            var (success, error, _) = await service.UpdateServiceAsync("DV_KHONTON",
                new SaveServiceDto { Name = "abc", Unit = "thang", Price = 1000 });

            Assert.False(success);
            Assert.Equal("Không tìm thấy dịch vụ.", error);
        }

        [Fact]
        public async Task DeleteService_Unreferenced_Ok()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, _, created) = await service.CreateServiceAsync(
                new SaveServiceDto { Name = "Dịch vụ xóa được", Unit = "thang", Price = 5000 });

            var (success, error) = await service.DeleteServiceAsync(created!.Id);

            Assert.True(success);
            Assert.Null(error);
            Assert.False(await context.DichVus.AnyAsync(d => d.MaDichVu == created.Id));
        }

        [Fact]
        public async Task DeleteService_WithRegistration_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, _, created) = await service.CreateServiceAsync(
                new SaveServiceDto { Name = "Dịch vụ đang dùng", Unit = "thang", Price = 5000 });
            var (phong, contracts) = await BuildRoomAsync(context, "D01", 1);

            context.DangKyDichVus.Add(new DangKyDichVu
            {
                MaHopDong = contracts[0].MaHopDong,
                MaDichVu = created!.Id,
                SoLuong = 1,
                NgayBatDau = new DateTime(2026, 10, 1),
                TrangThai = AppDefaults.ServiceActive
            });
            await context.SaveChangesAsync();

            var (success, error) = await service.DeleteServiceAsync(created.Id);

            Assert.False(success);
            Assert.Contains("ngừng hoạt động", error);
            Assert.True(await context.DichVus.AnyAsync(d => d.MaDichVu == created.Id));
            _ = phong;
        }

        // ============ Sinh viên đăng ký / hủy ============

        [Fact]
        public async Task StudentRegister_Ok_Pending_ThenDuplicateRejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, "R01", 1);

            var (success, error, regId) = await service.RegisterServiceForStudentAsync(
                contracts[0].MaSinhVien, ServiceCodes.Internet);

            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(regId);

            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(AppDefaults.ServicePending, registration.TrangThai);
            Assert.Equal(1, registration.SoLuong);

            var (againSuccess, againError, _) = await service.RegisterServiceForStudentAsync(
                contracts[0].MaSinhVien, ServiceCodes.Internet);
            Assert.False(againSuccess);
            Assert.Contains("đã có đơn", againError);
        }

        [Fact]
        public async Task StudentRegister_ChooseQuantityAndStartDate_SavedAsSubmitted()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, "RQ1", 1);

            var (success, error, regId) = await service.RegisterServiceForStudentAsync(
                contracts[0].MaSinhVien, ServiceCodes.Internet, 3, "01/12/2026");

            Assert.True(success);
            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(3, registration.SoLuong);
            Assert.Equal(new DateTime(2026, 12, 1), registration.NgayBatDau);

            // Sinh viên xem lại danh sách dịch vụ phải thấy đúng số lượng đã đăng ký.
            var options = await service.GetStudentServicesAsync(contracts[0].MaSinhVien);
            var internet = options.Single(o => o.ServiceId == ServiceCodes.Internet);
            Assert.Equal(3, internet.SoLuong);
            Assert.Equal("01/12/2026", internet.NgayBatDau);
        }

        [Fact]
        public async Task StudentRegister_InvalidQuantityOrDate_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, "RQ2", 1);
            var sv = contracts[0].MaSinhVien;

            var (q, qError, _) = await service.RegisterServiceForStudentAsync(sv, ServiceCodes.Internet, 0, null);
            Assert.False(q);
            Assert.Contains("từ 1 đến 10", qError);

            var (f, fError, _) = await service.RegisterServiceForStudentAsync(sv, ServiceCodes.Internet, 1, "31/02/2026");
            Assert.False(f);
            Assert.Contains("không hợp lệ", fError);

            var (p, pError, _) = await service.RegisterServiceForStudentAsync(sv, ServiceCodes.Internet, 1, "01/01/2026");
            Assert.False(p);
            Assert.Contains("ngày đã qua", pError);

            var (o, oError, _) = await service.RegisterServiceForStudentAsync(sv, ServiceCodes.Internet, 1, "01/09/2027");
            Assert.False(o);
            Assert.Contains("hạn hợp đồng", oError);

            Assert.False(await context.DangKyDichVus.AnyAsync(r => r.MaHopDong == contracts[0].MaHopDong));
        }

        [Fact]
        public async Task StudentRegister_NoContract_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var sv = await TestDataBuilder.CreateTestStudentAsync(context, "SVR0NOCD");
            await context.SaveChangesAsync();

            var (success, error, _) = await service.RegisterServiceForStudentAsync(
                sv.MaSinhVien, ServiceCodes.Internet);

            Assert.False(success);
            Assert.Contains("hợp đồng nội trú hiệu lực", error);
        }

        [Fact]
        public async Task StudentCancel_Ok_AndForeignRegistrationRejected()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, "R02", 2);

            var (_, _, regId) = await service.RegisterServiceForStudentAsync(
                contracts[0].MaSinhVien, ServiceCodes.Internet);

            // Sinh viên khác không được hủy đơn của bạn mình
            var (wrongSuccess, wrongError) = await service.CancelServiceForStudentAsync(
                contracts[1].MaSinhVien, regId!.Value);
            Assert.False(wrongSuccess);
            Assert.Equal("Không tìm thấy đơn đăng ký của bạn.", wrongError);

            var (success, error) = await service.CancelServiceForStudentAsync(
                contracts[0].MaSinhVien, regId.Value);
            Assert.True(success);
            Assert.Null(error);

            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(AppDefaults.ServiceCancelled, registration.TrangThai);
        }

        [Fact]
        public async Task GetStudentServices_ReflectsCurrentRegistrationStatus()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, "R03", 1);
            await service.RegisterServiceForStudentAsync(contracts[0].MaSinhVien, ServiceCodes.Internet);

            var options = await service.GetStudentServicesAsync(contracts[0].MaSinhVien);

            var internet = options.Single(o => o.ServiceId == ServiceCodes.Internet);
            Assert.Equal(AppDefaults.ServicePending, internet.Status);
            Assert.NotNull(internet.RegistrationId);

            var trash = options.Single(o => o.ServiceId == ServiceCodes.Trash);
            Assert.Null(trash.Status);
            Assert.Null(trash.RegistrationId);
        }

        // ============ Duyệt / từ chối của BQL ============

        private static async Task<(DichVuService Service, HopDong Contract, int RegistrationId)> NewPendingRegistrationAsync(
            ApplicationDbContext context, string tag)
        {
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, tag, 1);
            var (_, _, regId) = await service.RegisterServiceForStudentAsync(
                contracts[0].MaSinhVien, ServiceCodes.Internet);
            return (service, contracts[0], regId!.Value);
        }

        [Fact]
        public async Task Approve_Ok_SavesApproverDateAndNotification()
        {
            using var context = _fixture.CreateDbContext();
            var (service, contract, regId) = await NewPendingRegistrationAsync(context, "A01");

            var (success, error) = await service.ApproveRegistrationAsync(regId, "NV13");

            Assert.True(success);
            Assert.Null(error);

            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(AppDefaults.ServiceActive, registration.TrangThai);
            Assert.Equal("NV13", registration.MaNhanVienDuyet);
            Assert.NotNull(registration.NgayDuyet);

            var notice = await context.ThongBaos.SingleAsync(t => t.MaSinhVien == contract.MaSinhVien && t.Loai == "dichVu");
            Assert.Contains("đã được duyệt", notice.TieuDe);
        }

        [Fact]
        public async Task Approve_AlreadyApproved_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var (service, _, regId) = await NewPendingRegistrationAsync(context, "A02");
            await service.ApproveRegistrationAsync(regId, "NV13");

            var (success, error) = await service.ApproveRegistrationAsync(regId, "NV13");

            Assert.False(success);
            Assert.Equal("Đơn này không còn ở trạng thái chờ duyệt.", error);
        }

        [Fact]
        public async Task Reject_BlankReason_Rejected()
        {
            using var context = _fixture.CreateDbContext();
            var (service, _, regId) = await NewPendingRegistrationAsync(context, "A03");

            var (success, error) = await service.RejectRegistrationAsync(regId, "NV13", "  ");

            Assert.False(success);
            Assert.Equal("Vui lòng nhập lý do từ chối.", error);
            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(AppDefaults.ServicePending, registration.TrangThai);
        }

        [Fact]
        public async Task Reject_Ok_StoresReasonAndNotifiesStudent()
        {
            using var context = _fixture.CreateDbContext();
            var (service, contract, regId) = await NewPendingRegistrationAsync(context, "A04");

            var (success, error) = await service.RejectRegistrationAsync(regId, "NV13", "Phòng đã đủ nhu cầu trong kỳ này.");

            Assert.True(success);
            Assert.Null(error);

            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(AppDefaults.ServiceRejected, registration.TrangThai);
            Assert.Equal("Phòng đã đủ nhu cầu trong kỳ này.", registration.LyDoTuChoi);

            var notice = await context.ThongBaos.SingleAsync(t => t.MaSinhVien == contract.MaSinhVien && t.Loai == "dichVu");
            Assert.Contains("bị từ chối", notice.TieuDe);
        }

        [Fact]
        public async Task GetRegistrations_PendingFirst_AndRejectReasonVisible()
        {
            using var context = _fixture.CreateDbContext();
            var (service, _, pendingId) = await NewPendingRegistrationAsync(context, "A05");
            var (service2, _, approvedId) = await NewPendingRegistrationAsync(context, "A06");
            await service2.ApproveRegistrationAsync(approvedId, "NV13");

            // Lọc theo chờ duyệt: chỉ trả về đơn còn chờ
            var pending = await service.GetRegistrationsAsync(AppDefaults.ServicePending, SqlServerFixture.AcademicYear);
            Assert.Contains(pending, r => r.Id == pendingId);
            Assert.All(pending, r => Assert.Equal(AppDefaults.ServicePending, r.TrangThai));

            // Không lọc: đơn chờ duyệt phải nổi lên trước đơn đã duyệt
            var all = await service.GetRegistrationsAsync(null, SqlServerFixture.AcademicYear);
            var idxPending = all.FindIndex(r => r.Id == pendingId);
            var idxApproved = all.FindIndex(r => r.Id == approvedId);
            Assert.True(idxPending >= 0);
            Assert.True(idxApproved >= 0);
            Assert.True(idxPending < idxApproved);

            // Từ chối thì danh sách lọc theo daTuChoi phải thấy lý do
            await service.RejectRegistrationAsync(pendingId, "NV13", "Không phù hợp.");
            var rejected = await service.GetRegistrationsAsync(AppDefaults.ServiceRejected, SqlServerFixture.AcademicYear);
            var row = Assert.Single(rejected, r => r.Id == pendingId);
            Assert.Equal("Không phù hợp.", row.RejectReason);
        }

        // ============ Checkbox dịch vụ khi ghi chỉ số điện nước ============

        private static RecordUtilityDto RecordReq(string roomId) => new()
        {
            RoomId = roomId,
            NewElectric = 300,
            NewWater = 40,
            Thang = RecMonth,
            Nam = RecYear
        };

        [Fact]
        public async Task RecordUtility_InternetOn_CreatesActiveRegistrationsForAllResidents()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "U01", 2);
            var service = new DienNuocDichVuService(context);

            var req = RecordReq(phong.MaPhong);
            req.HasInternet = true;
            req.HasTrash = false;
            var dto = await service.RecordUtilityAsync(req, SqlServerFixture.AcademicYear, "NV13");

            Assert.NotNull(dto);
            var contractIds = contracts.Select(c => c.MaHopDong).ToList();
            var registrations = await context.DangKyDichVus
                .Where(r => contractIds.Contains(r.MaHopDong) && r.MaDichVu == ServiceCodes.Internet)
                .ToListAsync();

            Assert.Equal(2, registrations.Count);
            Assert.All(registrations, r =>
            {
                Assert.Equal(AppDefaults.ServiceActive, r.TrangThai);
                Assert.Equal("NV13", r.MaNhanVienDuyet);
                Assert.Equal(new DateTime(RecYear, RecMonth, 1), r.NgayBatDau);
            });
            Assert.Contains(ServiceCodes.Internet, dto!.ServiceCodes);
        }

        [Fact]
        public async Task RecordUtility_InternetOff_StopsExistingRegistration()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "U02", 1);
            context.DangKyDichVus.Add(new DangKyDichVu
            {
                MaHopDong = contracts[0].MaHopDong,
                MaDichVu = ServiceCodes.Internet,
                SoLuong = 1,
                NgayBatDau = new DateTime(RecYear, RecMonth - 1, 1),
                TrangThai = AppDefaults.ServiceActive
            });
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            var req = RecordReq(phong.MaPhong);
            req.HasInternet = false;
            var dto = await service.RecordUtilityAsync(req, SqlServerFixture.AcademicYear, "NV13");

            Assert.NotNull(dto);
            var registration = await context.DangKyDichVus
                .SingleAsync(r => r.MaHopDong == contracts[0].MaHopDong && r.MaDichVu == ServiceCodes.Internet);
            Assert.Equal(AppDefaults.ServiceCancelled, registration.TrangThai);
            Assert.Equal(new DateTime(RecYear, RecMonth, 1).AddDays(-1), registration.NgayKetThuc);
            Assert.DoesNotContain(ServiceCodes.Internet, dto!.ServiceCodes);
        }

        [Fact]
        public async Task RecordUtility_NullFlags_LeaveRegistrationsUnchanged()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "U03", 1);
            var service = new DienNuocDichVuService(context);

            var dto = await service.RecordUtilityAsync(RecordReq(phong.MaPhong), SqlServerFixture.AcademicYear, "NV13");

            Assert.NotNull(dto);
            var count = await context.DangKyDichVus
                .CountAsync(r => r.MaHopDong == contracts[0].MaHopDong);
            Assert.Equal(0, count);
        }

        // ============ Controller ============

        [Fact]
        public async Task DichVuApi_Approve_DoublesApprove_Returns400()
        {
            using var context = _fixture.CreateDbContext();
            var (service, _, regId) = await NewPendingRegistrationAsync(context, "C01");
            var controller = new DichVuApiController(service, new FakeCurrentUser { Role = "quanLy", StaffId = "NV13" });

            var first = await controller.ApproveRegistration(regId);
            Assert.IsType<OkObjectResult>(first);

            var second = await controller.ApproveRegistration(regId);
            Assert.IsType<BadRequestObjectResult>(second);
        }

        [Fact]
        public async Task StudentServiceApi_Register_Ok_AndMissingLogin_Unauthorized()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DichVuService(context);
            var (_, contracts) = await BuildRoomAsync(context, "C02", 1);

            var controller = new StudentServiceApiController(service,
                new FakeCurrentUser { Role = "sinhVien", StudentId = contracts[0].MaSinhVien });
            var ok = await controller.Register(ServiceCodes.Trash);
            Assert.IsType<OkObjectResult>(ok);

            var anonymous = new StudentServiceApiController(service, new FakeCurrentUser { Role = "sinhVien" });
            var unauthorized = await anonymous.Register(ServiceCodes.Trash);
            Assert.IsType<UnauthorizedObjectResult>(unauthorized);
        }

        [Fact]
        public async Task DichVuApi_Reject_MissingReason_Returns400()
        {
            using var context = _fixture.CreateDbContext();
            var (service, _, regId) = await NewPendingRegistrationAsync(context, "C03");
            var controller = new DichVuApiController(service, new FakeCurrentUser { Role = "admin", StaffId = "NV13" });

            var result = await controller.RejectRegistration(regId, new DichVuApiController.RejectRegistrationRequest());

            Assert.IsType<BadRequestObjectResult>(result);
            var registration = await context.DangKyDichVus.SingleAsync(r => r.MaDangKyDV == regId);
            Assert.Equal(AppDefaults.ServicePending, registration.TrangThai);
        }
    }
}
