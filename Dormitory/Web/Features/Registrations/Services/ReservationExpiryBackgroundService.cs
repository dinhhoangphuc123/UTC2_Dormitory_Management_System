using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Dormitory.Web.Features.Registrations.Services
{
    public class ReservationExpiryBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ReservationExpiryBackgroundService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);

        public ReservationExpiryBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<ReservationExpiryBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ReservationExpiryBackgroundService đã khởi động.");

            using var timer = new PeriodicTimer(_checkInterval);

            // Chạy kiểm tra ngay khi khởi động
            await RunCheckAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunCheckAsync(stoppingToken);
            }
        }

        private async Task RunCheckAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var expiryService = scope.ServiceProvider.GetRequiredService<IReservationExpiryService>();

                await expiryService.ProcessExpiredReservationsAsync(stoppingToken);
                await expiryService.ProcessUpcomingExpiryWarningsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình quét hết hạn giữ chỗ.");
            }
        }
    }
}
