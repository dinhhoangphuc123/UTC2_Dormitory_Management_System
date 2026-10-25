using System.Text.Json;
using Dormitory.Web.Data;
using Microsoft.EntityFrameworkCore;

namespace Dormitory.Web.Shared.Middleware;

/// <summary>
/// Makes the academic year a required scope for all business API calls.
/// The academic-year list and authentication APIs are intentionally unscoped.
/// </summary>
public sealed class AcademicYearScopeMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly RequestDelegate _next;

    public AcademicYearScopeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext httpContext, ApplicationDbContext dbContext)
    {
        var path = httpContext.Request.Path.Value?.TrimEnd('/') ?? string.Empty;
        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/auth", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/namhoc", StringComparison.OrdinalIgnoreCase))
        {
            await _next(httpContext);
            return;
        }

        var academicYear = httpContext.Request.Query["academicYear"].FirstOrDefault()?.Trim();
        var hasValidYear = !string.IsNullOrWhiteSpace(academicYear) &&
            await dbContext.NamHocs.AnyAsync(year => year.MaNamHoc == academicYear);

        if (hasValidYear)
        {
            await _next(httpContext);
            return;
        }

        httpContext.Response.ContentType = "application/json; charset=utf-8";
        if (HttpMethods.IsGet(httpContext.Request.Method) || HttpMethods.IsHead(httpContext.Request.Method))
        {
            // The UI's list APIs use the standard { success, data } response shape.
            httpContext.Response.StatusCode = StatusCodes.Status200OK;
            await JsonSerializer.SerializeAsync(
                httpContext.Response.Body,
                new { success = true, data = Array.Empty<object>() },
                JsonOptions,
                httpContext.RequestAborted);
            return;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        await JsonSerializer.SerializeAsync(
            httpContext.Response.Body,
            new { success = false, message = "Vui lòng chọn một năm học hợp lệ trước khi thao tác dữ liệu." },
            JsonOptions,
            httpContext.RequestAborted);
    }
}
