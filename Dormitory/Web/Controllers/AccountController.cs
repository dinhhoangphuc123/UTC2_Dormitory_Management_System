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
                    return RedirectToAction("Index", "Home");
                }
            }

            ViewBag.ErrorMessage = "Tên đăng nhập hoặc mật khẩu không chính xác.";
            return View();
        }

        [HttpGet]
        public IActionResult Logout()
        {
            return RedirectToAction("Login");
        }
    }
}

