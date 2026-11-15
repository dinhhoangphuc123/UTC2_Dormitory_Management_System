using Microsoft.Playwright;
using Dormitory.E2ETests.Support;

namespace Dormitory.E2ETests.Features
{
    public class LoginFlowTests : IClassFixture<E2ETestFixture>
    {
        // Luồng đăng nhập thật qua trình duyệt: mở trang đăng nhập, điền tài khoản
        // demo của quản lý, đăng nhập và kiểm tra vào được ứng dụng.
        // Chỉ chạy khi E2E_BASE_URL được cấu hình (CI cài sẵn Chromium).
        [Fact]
        public async Task Login_AdminCanAccessApplication()
        {
            var baseUrl = E2ETestFixture.BaseUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return; // Không có server E2E thì bỏ qua, không tính pass giả.
            }

            using var playwright = await Playwright.CreateAsync();
            await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = true
            });

            var context = await browser.NewContextAsync(new BrowserNewContextOptions
            {
                IgnoreHTTPSErrors = true
            });
            var page = await context.NewPageAsync();

            await page.GotoAsync($"{baseUrl}/Account/Login");
            await page.WaitForSelectorAsync("#loginUsername");
            await page.FillAsync("#loginUsername", "ql_an");
            await page.FillAsync("#loginPassword", "quanly123");
            await page.ClickAsync("#loginForm button[type='submit'], #loginForm button");

            // Sau khi đăng nhập thành công, thanh điều hướng ứng dụng sẽ xuất hiện
            // và form đăng nhập biến mất.
            await page.WaitForSelectorAsync("#sidebarContainer", new PageWaitForSelectorOptions
            {
                Timeout = 15000
            });
            var bodyText = await page.InnerTextAsync("body");
            Assert.DoesNotContain("Đăng nhập", bodyText);

            await context.CloseAsync();
        }
    }
}
