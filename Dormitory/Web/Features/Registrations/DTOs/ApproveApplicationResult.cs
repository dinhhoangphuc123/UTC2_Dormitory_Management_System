namespace Dormitory.Web.Features.Registrations.DTOs
{
    public class ApproveApplicationResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public int StatusCode { get; set; } = 200;

        public static ApproveApplicationResult Ok() => new() { Success = true, StatusCode = 200 };
        public static ApproveApplicationResult NotFound(string message) => new() { Success = false, ErrorMessage = message, StatusCode = 404 };
        public static ApproveApplicationResult Conflict(string message) => new() { Success = false, ErrorMessage = message, StatusCode = 409 };
    }
}
