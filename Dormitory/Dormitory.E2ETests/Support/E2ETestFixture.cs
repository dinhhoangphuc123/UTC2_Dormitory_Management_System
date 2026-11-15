namespace Dormitory.E2ETests.Support
{
    public class E2ETestFixture : IDisposable
    {
        // E2E chỉ chạy khi có server thật (mặc định CI không chạy các test này).
        // Đặt E2E_BASE_URL=https://localhost:XXXX hoặc http://localhost:XXXX để bật.
        public static string? BaseUrl =>
            Environment.GetEnvironmentVariable("E2E_BASE_URL")?.TrimEnd('/');

        public static bool IsEnabled => !string.IsNullOrWhiteSpace(BaseUrl);

        public void Dispose()
        {
        }
    }
}
