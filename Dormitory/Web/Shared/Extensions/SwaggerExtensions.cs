namespace Dormitory.Web.Shared.Extensions
{
    public static class SwaggerExtensions
    {
        public static IServiceCollection AddDormitorySwagger(this IServiceCollection services)
        {
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new()
                {
                    Title = "Dormitory Management API",
                    Version = "v1",
                    Description = "API quản lý ký túc xá: sinh viên, phòng, hợp đồng, hóa đơn, điện nước."
                });
                options.SupportNonNullableReferenceTypes();
            });

            return services;
        }

        public static IApplicationBuilder UseDormitorySwagger(this IApplicationBuilder app)
        {
            var environment = app.ApplicationServices.GetRequiredService<IWebHostEnvironment>();

            // Không phơi tài liệu API ra môi trường production.
            if (!environment.IsDevelopment())
            {
                return app;
            }

            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "Dormitory Management API v1");
                options.RoutePrefix = "swagger";
                options.DocumentTitle = "Dormitory API";
            });

            return app;
        }
    }
}
