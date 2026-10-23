using Dormitory.Web.Shared.Extensions;
using Dormitory.Web.Shared.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Database context
builder.Services.AddDormitoryDatabase(builder.Configuration);

// Feature slices
builder.Services.AddDormitoryFeatures();

// Swagger / OpenAPI
builder.Services.AddDormitorySwagger();

var app = builder.Build();

// Global exception handling
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.UseDormitorySwagger();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Initialize database schema & seed data
await app.InitializeDormitoryDatabaseAsync();

app.Run();

public partial class Program { }

