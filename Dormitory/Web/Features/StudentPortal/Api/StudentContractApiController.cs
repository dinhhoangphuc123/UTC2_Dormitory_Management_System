using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.StudentPortal.Api
{
    [Authorize(Policy = RoleNames.StudentOnlyPolicy)]
    [ApiController]
    [Route("api/me/contracts")]
    public class StudentContractApiController : ControllerBase
    {
        private readonly IStudentPortalService _portalService;
        private readonly ICurrentUser? _currentUser;

        public StudentContractApiController(IStudentPortalService portalService, ICurrentUser? currentUser = null)
        {
            _portalService = portalService;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var contracts = await _portalService.GetContractsAsync(studentId);
            return Ok(ApiResponse<List<StudentContractDto>>.Ok(contracts));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var studentId = _currentUser?.StudentId;
            if (string.IsNullOrEmpty(studentId)) return Unauthorized(ApiResponse.Fail("Chưa đăng nhập."));

            var contract = await _portalService.GetContractByIdAsync(studentId, id);
            if (contract == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hợp đồng."));
            }

            return Ok(ApiResponse<StudentContractDto>.Ok(contract));
        }
    }
}
