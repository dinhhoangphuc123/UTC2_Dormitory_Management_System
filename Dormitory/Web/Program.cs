using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Extensions;
using Dormitory.Web.Shared.Middleware;
using Dormitory.Web.Shared.Models;
using Dormitory.Web.Shared.Security;
using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.Clear();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    return context.Response.WriteAsJsonAsync(ApiResponse.Fail("Chưa đăng nhập hoặc phiên làm việc đã hết hạn."));
                }
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.Clear();
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    return context.Response.WriteAsJsonAsync(ApiResponse.Fail("Bạn không có quyền thực hiện thao tác này."));
                }
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(RoleNames.StaffOnlyPolicy, policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.QuanLy, RoleNames.KeToan));
    options.AddPolicy(RoleNames.AdminOrManagerPolicy, policy =>
        policy.RequireRole(RoleNames.Admin, RoleNames.QuanLy));
    options.AddPolicy(RoleNames.StudentOnlyPolicy, policy =>
        policy.RequireRole(RoleNames.SinhVien));
});

// Options
builder.Services.Configure<RegistrationOptions>(builder.Configuration.GetSection(RegistrationOptions.SectionName));
builder.Services.Configure<PaymentOptions>(builder.Configuration.GetSection(PaymentOptions.SectionName));
builder.Services.Configure<StudentPortalOptions>(builder.Configuration.GetSection(StudentPortalOptions.SectionName));

// Database context
builder.Services.AddDormitoryDatabase(builder.Configuration);

// Feature slices
builder.Services.AddDormitoryFeatures();

// Swagger / OpenAPI
builder.Services.AddDormitorySwagger();

var app = builder.Build();

// Global exception handling
app.UseMiddleware<ApiRequestLoggingMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<LoginRateLimitMiddleware>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    // Developer page chỉ cho trang HTML; request /api vẫn đi qua ExceptionHandlingMiddleware
    // để luôn trả JSON (tránh trang lỗi HTML làm hỏng response.json() của frontend).
    app.Use(async (context, next) =>
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await next(context);
            return;
        }
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "API error: {Message}", ex.Message);
            if (!context.Response.HasStarted)
            {
                context.Response.ContentType = "application/json; charset=utf-8";
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new { success = false, message = ex.Message });
            }
        }
    });
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseDormitorySwagger();
app.UseAuthentication();
app.UseMiddleware<AcademicYearScopeMiddleware>();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Initialize database schema & seed data
await app.InitializeDormitoryDatabaseAsync();

app.Run();

public partial class Program { }
