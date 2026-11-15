using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dormitory.Web.Data;
using Dormitory.Web.Data.Seeding;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.UnitTests.Features.StudentPortal
{
    /// <summary>
    /// Các test này chạy hoàn toàn trong bộ nhớ, không phụ thuộc server đang chạy.
    /// </summary>
    public class StudentSupportViewsTests
    {
        private const string StudentId = "6451071012";

        private static ApplicationDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase($"KtxUnitTests_{Guid.NewGuid()}")
                .Options;

            var context = new ApplicationDbContext(options);
            DbSeeder.SeedAllAsync(context).GetAwaiter().GetResult();
            DemoDataSeeder.SeedAsync(context).GetAwaiter().GetResult();
            return context;
        }

        private static StudentPortalService CreateService(
            ApplicationDbContext context,
            StudentPortalOptions? portalOptions = null)
        {
            var expiryService = new ReservationExpiryService(
                context,
                NullLogger<ReservationExpiryService>.Instance);

            return new StudentPortalService(
                context,
                new PasswordHasher(),
                Options.Create(portalOptions ?? new StudentPortalOptions
                {
                    Regulations = "Nội quy KTX",
                    RegistrationGuide = "Hướng dẫn đăng ký",
                    PaymentGuide = "Hướng dẫn thanh toán",
                    CheckInOutProcess = "Quy trình nhận/trả phòng",
                    ContactInfo = "Ban quản lý KTX"
                }),
                Options.Create(new PaymentOptions()),
                expiryService,
                NullLogger<StudentPortalService>.Instance);
        }

        [Fact]
        public async Task Notifications_Returns_List_And_UnreadCount()
        {
            using var context = CreateContext();
            context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = StudentId,
                TieuDe = "Thông báo kiểm tra phòng",
                NoiDung = "Ban quản lý sẽ kiểm tra phòng vào ngày mai.",
                Loai = "chung",
                NgayTao = DateTime.Now
            });
            await context.SaveChangesAsync();

            var service = CreateService(context);

            var notifications = await service.GetNotificationsAsync(StudentId);
            Assert.NotEmpty(notifications);

            var unreadCount = await service.GetUnreadNotificationCountAsync(StudentId);
            Assert.True(unreadCount >= 1);
        }

        [Fact]
        public async Task Violations_Returns_Empty_State_When_None()
        {
            using var context = CreateContext();
            var service = CreateService(context);

            var violations = await service.GetViolationsAsync(StudentId);

            Assert.NotNull(violations);
            Assert.Empty(violations);
        }

        [Fact]
        public void SupportInfo_Returns_Expected_Sections()
        {
            using var context = CreateContext();
            var service = CreateService(context, new StudentPortalOptions
            {
                Regulations = "Nội quy KTX",
                RegistrationGuide = "Hướng dẫn đăng ký",
                PaymentGuide = "Hướng dẫn thanh toán",
                CheckInOutProcess = "Quy trình nhận/trả phòng",
                ContactInfo = "Ban quản lý KTX"
            });

            var info = service.GetSupportInfo();

            Assert.False(string.IsNullOrWhiteSpace(info.Regulations));
            Assert.False(string.IsNullOrWhiteSpace(info.ContactInfo));
        }
    }
}
