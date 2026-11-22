using System.Collections.Concurrent;

namespace Dormitory.Web.Shared.Middleware;

/// <summary>
/// Giới hạn số lần đăng nhập thất bại theo IP (P2: chống dò mật khẩu).
/// Chỉ áp cho /api/auth/login, tối đa 10 lần / 5 phút / IP.
/// </summary>
public sealed class LoginRateLimitMiddleware
{
    private const int MaxAttempts = 10;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(5);
    private static readonly ConcurrentDictionary<string, Queue<DateTime>> Attempts = new();

    private readonly RequestDelegate _next;

    public LoginRateLimitMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.TrimEnd('/') ?? string.Empty;
        var isLogin = HttpMethods.IsPost(context.Request.Method) &&
            (path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/Account/Login", StringComparison.OrdinalIgnoreCase));
        if (!isLogin)
        {
            await _next(context);
            return;
        }

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;
        var queue = Attempts.GetOrAdd(ip, _ => new Queue<DateTime>());

        bool overLimit;
        TimeSpan retryAfter;
        lock (queue)
        {
            while (queue.Count > 0 && queue.Peek() < now - Window)
            {
                queue.Dequeue();
            }

            overLimit = queue.Count >= MaxAttempts;
            retryAfter = overLimit ? (queue.Peek() + Window - now) : TimeSpan.Zero;
        }

        if (overLimit)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers.RetryAfter = retryAfter.TotalSeconds.ToString("0");
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(
                "{\"success\":false,\"message\":\"Đăng nhập thử quá nhiều lần. Vui lòng thử lại sau.\"}");
            return;
        }

        await _next(context);

        bool isFormLogin = path.Equals("/Account/Login", StringComparison.OrdinalIgnoreCase);
        bool loginFailed = context.Response.StatusCode is StatusCodes.Status401Unauthorized or StatusCodes.Status400BadRequest
            || (isFormLogin && context.Response.StatusCode == StatusCodes.Status200OK);
        bool loginSucceeded = (!isFormLogin && context.Response.StatusCode == StatusCodes.Status200OK)
            || context.Response.StatusCode == StatusCodes.Status302Found;

        if (loginFailed)
        {
            lock (queue)
            {
                queue.Enqueue(DateTime.UtcNow);
            }
        }
        else if (loginSucceeded)
        {
            lock (queue)
            {
                queue.Clear();
            }
            Attempts.TryRemove(ip, out _);
        }

        if (Attempts.Count > 100)
        {
            foreach (var kv in Attempts)
            {
                lock (kv.Value)
                {
                    while (kv.Value.Count > 0 && kv.Value.Peek() < now - Window)
                    {
                        kv.Value.Dequeue();
                    }
                    if (kv.Value.Count == 0)
                    {
                        Attempts.TryRemove(kv.Key, out _);
                    }
                }
            }
        }
    }
}
