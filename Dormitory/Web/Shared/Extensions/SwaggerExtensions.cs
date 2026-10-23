namespace Dormitory.Web.Shared.Extensions
{
    public static class SwaggerExtensions
    {
        public static IServiceCollection AddDormitorySwagger(this IServiceCollection services)
        {
            // Có thể bổ sung Swashbuckle hoặc OpenAPI
            return services;
        }

        public static IApplicationBuilder UseDormitorySwagger(this IApplicationBuilder app)
        {
            return app;
        }
    }
}

