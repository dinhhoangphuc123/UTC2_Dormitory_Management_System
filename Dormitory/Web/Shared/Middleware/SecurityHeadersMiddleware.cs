namespace Dormitory.Web.Shared.Middleware;

/// <summary>
/// Thêm các header bảo mật cơ bản cho mọi response (P2).
/// CSP tách theo môi trường: dev nới lỏng cho Swagger, production siết chặt hơn.
/// </summary>
public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _isDevelopment;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
    {
        _next = next;
        _isDevelopment = environment.IsDevelopment();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "SAMEORIGIN";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        if (!string.IsNullOrEmpty(headers["Content-Security-Policy"]))
        {
            headers.Remove("Content-Security-Policy");
        }

        headers["Content-Security-Policy"] = _isDevelopment
            ? "default-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self'; font-src 'self' data: https://fonts.gstatic.com https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
            : "default-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self'; font-src 'self' data: https://fonts.gstatic.com https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";

        await _next(context);
    }
}
