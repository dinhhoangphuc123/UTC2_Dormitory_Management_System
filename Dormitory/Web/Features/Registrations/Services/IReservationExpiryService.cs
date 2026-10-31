namespace Dormitory.Web.Features.Registrations.Services
{
    public interface IReservationExpiryService
    {
        Task<int> ProcessExpiredReservationsAsync(CancellationToken cancellationToken = default);
        Task<int> ProcessUpcomingExpiryWarningsAsync(CancellationToken cancellationToken = default);
    }
}
