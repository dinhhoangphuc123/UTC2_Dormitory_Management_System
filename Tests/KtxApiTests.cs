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
    }
}

