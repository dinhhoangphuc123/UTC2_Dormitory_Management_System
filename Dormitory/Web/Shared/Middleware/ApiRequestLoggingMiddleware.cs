using System.Diagnostics;

namespace Dormitory.Web.Shared.Middleware;

/// <summary>
/// Ghi log mỗi request kèm thời gian xử lý và người dùng (không ghi mật khẩu/thông tin nhạy cảm).
/// </summary>
public sealed class ApiRequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiRequestLoggingMiddleware> _logger;

    public ApiRequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<ApiRequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var startedAt = Stopwatch.GetTimestamp();

        try
        {
            await _next(context);
        }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(startedAt);
            var level = context.Response.StatusCode >= 500
                ? LogLevel.Error
                : context.Response.StatusCode >= 400
                    ? LogLevel.Warning
                    : LogLevel.Information;
            var user = context.User.Identity?.Name ?? "anonymous";
            var academicYear = context.Request.Query["academicYear"].FirstOrDefault() ?? "-";
            _logger.Log(level,
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds:0.0000} ms User={User} AcademicYear={AcademicYear}",
                context.Request.Method,
                context.Request.Path.Value,
                context.Response.StatusCode,
                elapsed.TotalMilliseconds,
                user,
                academicYear);
        }
    }
}
