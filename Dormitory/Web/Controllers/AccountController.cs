using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Accounts.Services;

namespace Dormitory.Web.Controllers
{
    public class AccountController : Controller
    {
        private readonly IAuthService _authService;

        public AccountController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromForm] string? username, [FromForm] string? password, [FromForm] string? loginUsername, [FromForm] string? loginPassword)
        {
            var userParam = !string.IsNullOrWhiteSpace(username) ? username : loginUsername;
            var passParam = !string.IsNullOrWhiteSpace(password) ? password : loginPassword;

            if (!string.IsNullOrWhiteSpace(userParam) && !string.IsNullOrWhiteSpace(passParam))
            {
                var user = await _authService.AuthenticateAsync(userParam, passParam);
                if (user != null)
                {
                    var claims = new List<Claim>
                    {
                        new(ClaimTypes.NameIdentifier, user.Username),
                        new(ClaimTypes.Name, user.Name),
                        new(ClaimTypes.Role, user.RoleCode)
                    };

                    if (!string.IsNullOrWhiteSpace(user.StaffId))
                    {
                        claims.Add(new Claim("StaffId", user.StaffId));
                    }

                    if (!string.IsNullOrWhiteSpace(user.StudentId))
                    {
                        claims.Add(new Claim("StudentId", user.StudentId));
                    }

                    var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                    var principal = new ClaimsPrincipal(identity);
                    var authProperties = new AuthenticationProperties
                    {
                        IsPersistent = true,
                        ExpiresUtc = DateTimeOffset.UtcNow.AddHours(2)
                    };

                    await HttpContext.SignInAsync(
                        CookieAuthenticationDefaults.AuthenticationScheme,
                        principal,
                        authProperties);

                    return RedirectToAction("Index", "Home");
                }
            }

            ViewBag.ErrorMessage = "Tên đăng nhập hoặc mật khẩu không chính xác.";
            return View();
        }

        [HttpGet]
        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Login");
        }
    }
}
