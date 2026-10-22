using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Controllers.Api;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Implementations;
using Xunit;

namespace Tests
{
    public class KtxApiTests
    {
        private ApplicationDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: $"KtxTestDb_{Guid.NewGuid()}")
                .Options;

            var context = new ApplicationDbContext(options);
            DbInitializer.SeedAsync(context).GetAwaiter().GetResult();
            return context;
        }

        [Fact]
        public async Task AuthApi_Login_Success_With_Demo_Account()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var authService = new AuthService(context);
            var controller = new AuthApiController(authService);

            // Act: Login as Quản lý KTX
            var result = await controller.Login(new LoginRequestDto
            {
                Username = "ql_an",
                Password = "quanly123"
            });

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<UserProfileDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal("ql_an", response.Data?.Username);
            Assert.Equal("Quản lý", response.Data?.Role);
        }

        [Fact]
        public async Task AuthApi_Login_Failure_With_Wrong_Password()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var authService = new AuthService(context);
            var controller = new AuthApiController(authService);

            // Act
            var result = await controller.Login(new LoginRequestDto
            {
                Username = "ql_an",
                Password = "wrong"
            });

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task DashboardApi_Returns_Valid_Summary_And_KPIs()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var dashboardService = new DashboardService(context);
            var controller = new DashboardApiController(dashboardService);

            // Act
            var result = await controller.GetSummary();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<DashboardSummaryDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Equal(3420, response.Data.TotalStudents);
            Assert.Equal(3800, response.Data.TotalCapacity);
            Assert.Equal(90.0, response.Data.OccupancyPercent);
            Assert.NotEmpty(response.Data.UrgentTasks);
        }

        [Fact]
        public async Task DashboardApi_Resolves_Urgent_Task()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var dashboardService = new DashboardService(context);
            var controller = new DashboardApiController(dashboardService);

            // Act: Resolve task t1
            var result = await controller.ResolveTask("t1");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.True(response.Success);
        }

        [Fact]
        public async Task SinhVienApi_Returns_Student_List_And_Filter()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var studentService = new SinhVienService(context);
            var controller = new SinhVienApiController(studentService);

            // Act
            var result = await controller.GetAll(cohort: "K64", major: null, status: null, search: null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<List<SinhVienListItemDto>>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotEmpty(response.Data!);
            Assert.All(response.Data!, s => Assert.Contains("K64", s.Cohort));
        }

        [Fact]
        public async Task HopDongApi_Creates_And_Renews_Contract()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var contractService = new HopDongService(context);
            var controller = new HopDongApiController(contractService);

            // Act: Create new contract
            var createResult = await controller.Create(new CreateContractRequestDto
            {
                StudentName = "Lê Văn Tiến",
                Mssv = "6451079999",
                RoomNumber = "A102",
                BedNumber = "G02",
                MonthlyFee = 500000,
                DepositAmount = 500000,
                StartDate = "01/10/2026",
                EndDate = "30/06/2027"
            });

            // Assert
            var okCreate = Assert.IsType<OkObjectResult>(createResult);
            var responseCreate = Assert.IsType<ApiResponse<ContractListItemDto>>(okCreate.Value);
            Assert.True(responseCreate.Success);
            Assert.Equal("Lê Văn Tiến", responseCreate.Data?.StudentName);

            // Act: Renew contract
            var renewResult = await controller.Renew(responseCreate.Data!.ContractNumber, months: 5);
            var okRenew = Assert.IsType<OkObjectResult>(renewResult);
            var responseRenew = Assert.IsType<ApiResponse>(okRenew.Value);
            Assert.True(responseRenew.Success);
        }

        [Fact]
        public async Task DonDangKyApi_Approve_And_Reject_Flow()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var appService = new DonDangKyService(context);
            var controller = new DonDangKyApiController(appService);

            // Act: Get apps
            var listResult = await controller.GetAll(statusTab: "pending", priority: null, cohort: null, gender: null);
            var okList = Assert.IsType<OkObjectResult>(listResult);
            var responseList = Assert.IsType<ApiResponse<List<ApplicationListItemDto>>>(okList.Value);
            Assert.True(responseList.Success);
            Assert.NotEmpty(responseList.Data!);

            // Act: Approve first app
            var firstApp = responseList.Data!.First();
            var approveResult = await controller.Approve(firstApp.Id);
            var okApprove = Assert.IsType<OkObjectResult>(approveResult);
            var responseApprove = Assert.IsType<ApiResponse>(okApprove.Value);
            Assert.True(responseApprove.Success);
        }

        [Fact]
        public async Task PhongApi_Returns_Rooms_And_Toggles_Bed_Maintenance()
        {
            // Arrange
            var context = CreateInMemoryDbContext();
            var roomService = new PhongService(context);
            var controller = new PhongApiController(roomService);

            // Act: Get rooms
            var listResult = await controller.GetAll(buildingId: "A01", floor: null, status: null, search: null);
            var okList = Assert.IsType<OkObjectResult>(listResult);
            var responseList = Assert.IsType<ApiResponse<List<RoomListItemDto>>>(okList.Value);
            Assert.True(responseList.Success);
            Assert.NotEmpty(responseList.Data!);

            var firstRoom = responseList.Data!.First();
            Assert.NotEmpty(firstRoom.Beds);

            // Act: Toggle bed maintenance
            var firstBed = firstRoom.Beds.First();
            var toggleResult = await controller.ToggleMaintenance(firstBed.Id);
            var okToggle = Assert.IsType<OkObjectResult>(toggleResult);
            var responseToggle = Assert.IsType<ApiResponse>(okToggle.Value);
            Assert.True(responseToggle.Success);
        }

        [Fact]
        public async Task LopHocApi_GetAll_And_CreateClass_Succeeds()
        {
            var context = CreateInMemoryDbContext();
            var service = new LopHocService(context);
            var controller = new LopHocApiController(service);

            // Act: Create new class
            var createResult = await controller.Create(new CreateClassDto
            {
                Code = "CNTT-K65TEST",
                Name = "Công nghệ Thông tin K65 Test",
                Faculty = "Khoa Công nghệ thông tin",
                FacultyKey = "cntt",
                Advisor = "TS. Test",
                Cohort = "k65",
                TotalStudents = 60,
                Residents = 30
            });
            var okCreate = Assert.IsType<OkObjectResult>(createResult);
            var resCreate = Assert.IsType<ApiResponse<ClassItemDto>>(okCreate.Value);
            Assert.True(resCreate.Success);
            Assert.Equal("CNTT-K65TEST", resCreate.Data?.Code);

            // Act: List classes
            var listResult = await controller.GetAll(faculty: null, cohort: null, search: "K65TEST");
            var okList = Assert.IsType<OkObjectResult>(listResult);
            var resList = Assert.IsType<ApiResponse<List<ClassItemDto>>>(okList.Value);
            Assert.True(resList.Success);
            Assert.Single(resList.Data!);
        }

        [Fact]
        public async Task DienNuocApi_GetAll_And_RecordUtility_Succeeds()
        {
            var context = CreateInMemoryDbContext();
            var service = new DienNuocDichVuService(context);
            var controller = new DienNuocApiController(service);

            // Act: List utilities
            var listResult = await controller.GetAll(building: null, floor: null, status: null, search: null);
            var okList = Assert.IsType<OkObjectResult>(listResult);
            var resList = Assert.IsType<ApiResponse<List<UtilityItemDto>>>(okList.Value);
            Assert.True(resList.Success);
            Assert.NotEmpty(resList.Data!);

            // Act: Record utility
            var first = resList.Data!.First();
            var recordResult = await controller.Record(new RecordUtilityDto
            {
                RoomId = first.Id,
                NewElectric = first.OldElectric + 150,
                NewWater = first.OldWater + 15,
                HasInternet = true,
                HasTrash = true
            });
            var okRecord = Assert.IsType<OkObjectResult>(recordResult);
            var resRecord = Assert.IsType<ApiResponse<UtilityItemDto>>(okRecord.Value);
            Assert.True(resRecord.Success);
            Assert.Equal(150, resRecord.Data?.UsageElectric);
        }

        [Fact]
        public async Task HoaDonApi_GetAll_And_ConfirmPayment_Succeeds()
        {
            var context = CreateInMemoryDbContext();
            var service = new HoaDonService(context);
            var controller = new HoaDonApiController(service);

            // Act: Get invoices
            var listResult = await controller.GetAll(building: null, category: null, status: null, search: null);
            var okList = Assert.IsType<OkObjectResult>(listResult);
            var resList = Assert.IsType<ApiResponse<List<InvoiceItemDto>>>(okList.Value);
            Assert.True(resList.Success);
            Assert.NotEmpty(resList.Data!);

            // Act: Confirm payment
            var first = resList.Data!.First();
            var payResult = await controller.ConfirmPayment(new ConfirmPaymentDto
            {
                InvoiceId = first.Code,
                PaymentMethod = "VNPAY QR"
            });
            var okPay = Assert.IsType<OkObjectResult>(payResult);
            var resPay = Assert.IsType<ApiResponse>(okPay.Value);
            Assert.True(resPay.Success);
        }

        [Fact]
        public async Task SuaChuaApi_GetAll_Create_And_AssignTicket_Succeeds()
        {
            var context = CreateInMemoryDbContext();
            var service = new YeuCauSuaChuaService(context);
            var controller = new SuaChuaApiController(service);

            // Act: Create ticket
            var createResult = await controller.Create(new CreateTicketDto
            {
                Building = "A01",
                Room = "A101",
                Category = "Điện dân dụng",
                Priority = "Khẩn cấp",
                Reporter = "Nguyễn Văn Test",
                Phone = "0909123456",
                Description = "Bóng đèn chập chờn cần thay mới"
            });
            var okCreate = Assert.IsType<OkObjectResult>(createResult);
            var resCreate = Assert.IsType<ApiResponse<MaintenanceTicketDto>>(okCreate.Value);
            Assert.True(resCreate.Success);

            // Act: Assign ticket
            var ticketId = resCreate.Data!.Id;
            var assignResult = await controller.Assign(new AssignTicketDto
            {
                TicketId = ticketId,
                Technician = "Phạm Thành",
                Deadline = "Trong ngày"
            });
            var okAssign = Assert.IsType<OkObjectResult>(assignResult);
            var resAssign = Assert.IsType<ApiResponse>(okAssign.Value);
            Assert.True(resAssign.Success);
        }

        [Fact]
        public async Task ViPhamApi_GetAll_Create_And_Close_Succeeds()
        {
            var context = CreateInMemoryDbContext();
            var service = new ViPhamService(context);
            var controller = new ViPhamApiController(service);

            // Act: Create violation
            var createResult = await controller.Create(new CreateViolationDto
            {
                StudentId = "6451071012",
                StudentName = "Trần Minh Hoàng",
                Building = "A01",
                Room = "A101",
                Violation = "Nấu ăn sai quy định",
                ViolationType = "cook",
                Penalty = "Khiển trách",
                PenaltyType = "reprimand",
                Notes = "Sử dụng ấm đun siêu tốc"
            });
            var okCreate = Assert.IsType<OkObjectResult>(createResult);
            var resCreate = Assert.IsType<ApiResponse<ViolationRecordDto>>(okCreate.Value);
            Assert.True(resCreate.Success);

            // Act: Close violation
            var closeResult = await controller.Close(resCreate.Data!.Id);
            var okClose = Assert.IsType<OkObjectResult>(closeResult);
            var resClose = Assert.IsType<ApiResponse>(okClose.Value);
            Assert.True(resClose.Success);
        }

        [Fact]
        public async Task NhanVienApi_GetAll_Create_And_ToggleStatus_Succeeds()
        {
            var context = CreateInMemoryDbContext();
            var service = new NhanVienService(context);
            var controller = new NhanVienApiController(service);

            // Act: Create staff
            var createResult = await controller.Create(new CreateStaffDto
            {
                Name = "Lê Văn Test",
                Position = "Cán bộ Quản lý",
                Department = "Ban Quản trị KTX",
                DepartmentKey = "bql",
                ManagedArea = "Tòa A01",
                Phone = "0911222333",
                Email = "test.lv@utc2.edu.vn",
                Role = "Ban Quản lý"
            });
            var okCreate = Assert.IsType<OkObjectResult>(createResult);
            var resCreate = Assert.IsType<ApiResponse<StaffItemDto>>(okCreate.Value);
            Assert.True(resCreate.Success);

            // Act: Toggle status
            var toggleResult = await controller.ToggleStatus(resCreate.Data!.Id);
            var okToggle = Assert.IsType<OkObjectResult>(toggleResult);
            var resToggle = Assert.IsType<ApiResponse>(okToggle.Value);
            Assert.True(resToggle.Success);
        }

        [Fact]
        public async Task BaoCaoApi_GetSummary_Returns_ValidData()
        {
            var context = CreateInMemoryDbContext();
            var service = new BaoCaoService(context);
            var controller = new BaoCaoApiController(service);

            // Act: Get summary
            var summaryResult = await controller.GetSummary(semester: "Năm học 2026-2027 · HK1", scope: null);
            var okSummary = Assert.IsType<OkObjectResult>(summaryResult);
            var resSummary = Assert.IsType<ApiResponse<ReportSummaryDto>>(okSummary.Value);
            Assert.True(resSummary.Success);
            Assert.NotNull(resSummary.Data);
            Assert.True(resSummary.Data?.TotalBeds > 0);
            Assert.NotEmpty(resSummary.Data?.BuildingOperations!);
        }
    }
}

