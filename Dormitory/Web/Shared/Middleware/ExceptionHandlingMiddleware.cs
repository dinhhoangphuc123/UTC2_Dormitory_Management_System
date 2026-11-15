using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Dormitory.Web.Shared.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Đã xảy ra lỗi không mong muốn khi xử lý yêu cầu: {Message}", ex.Message);
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            // API luôn trả JSON để frontend hiển thị đúng nguyên nhân, không trả HTML/text.
            if (context.Response.HasStarted)
            {
                return;
            }

            bool isApi = context.Request.Path.StartsWithSegments("/api");
            var detail = _env.IsDevelopment()
                ? exception.Message
                : "Đã xảy ra lỗi hệ thống. Vui lòng liên hệ quản trị viên.";

            if (isApi)
            {
                context.Response.ContentType = "application/json; charset=utf-8";
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                var payload = new { success = false, message = detail };
                var json = JsonSerializer.Serialize(payload);
                await context.Response.WriteAsync(json);
                return;
            }

            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var problem = new ProblemDetails
            {
                Status = context.Response.StatusCode,
                Title = "Lỗi máy chủ nội bộ",
                Detail = detail,
                Instance = context.Request.Path
            };

            var problemJson = JsonSerializer.Serialize(problem, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(problemJson);
        }
    }
}
