using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Validators;
using Dormitory.Web.Features.Accounts.Enums;

namespace Dormitory.UnitTests.Features.Staff
{
    public class CreateStaffValidatorTests
    {
        [Fact]
        public void Validate_WithValidStaff_ShouldPass()
        {
            var dto = new CreateStaffDto
            {
                Name = "Trần Văn B",
                Position = "Giám thị",
                Phone = "0912345678",
                Email = "vanb@utc2.edu.vn",
                Role = RoleCodes.QuanLy
            };

            var (isValid, errorMessage) = CreateStaffValidator.Validate(dto);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithInvalidEmail_ShouldFail()
        {
            var dto = new CreateStaffDto
            {
                Name = "Trần Văn B",
                Position = "Giám thị",
                Phone = "0912345678",
                Email = "invalid-email",
                Role = RoleCodes.QuanLy
            };

            var (isValid, _) = CreateStaffValidator.Validate(dto);
            Assert.False(isValid);
        }

        [Fact]
        public void Validate_WithUnknownRole_ShouldFail()
        {
            var dto = new CreateStaffDto
            {
                Name = "Trần Văn B",
                Position = "Giám thị",
                Phone = "0912345678",
                Email = "vanb@utc2.edu.vn",
                Role = "fakeRole"
            };

            var (isValid, _) = CreateStaffValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}
