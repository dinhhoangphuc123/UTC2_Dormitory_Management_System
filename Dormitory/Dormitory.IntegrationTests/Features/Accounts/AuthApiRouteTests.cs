using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Accounts.Api;

namespace Dormitory.IntegrationTests.Features.Accounts
{
    public class AuthApiRouteTests
    {
        [Fact]
        public void Controller_UsesAuthRoutePrefixExpectedByFrontend()
        {
            var route = Assert.Single(typeof(AuthApiController).GetCustomAttributes(typeof(RouteAttribute), inherit: true));

            Assert.Equal("api/auth", Assert.IsType<RouteAttribute>(route).Template);
        }
    }
}
