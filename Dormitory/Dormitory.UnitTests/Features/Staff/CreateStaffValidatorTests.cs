using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Validators;

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
                Phone = "0912345678",
                Email = "vanb@utc2.edu.vn"
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
                Phone = "0912345678",
                Email = "invalid-email"
            };

            var (isValid, _) = CreateStaffValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}

