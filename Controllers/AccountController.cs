using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers
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
        public async Task<IActionResult> Login(string username, string password)
        {
            var user = await _authService.AuthenticateAsync(username, password);
            if (user != null)
            {
                return RedirectToAction("Index", "Home");
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

