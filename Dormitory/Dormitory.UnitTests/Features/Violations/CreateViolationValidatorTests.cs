using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Validators;

namespace Dormitory.UnitTests.Features.Violations
{
    public class CreateViolationValidatorTests
    {
        [Fact]
        public void Validate_WithValidViolation_ShouldPass()
        {
            var dto = new CreateViolationDto
            {
                StudentId = "6451071012",
                Violation = "Sử dụng bếp từ công suất lớn"
            };

            var (isValid, errorMessage) = CreateViolationValidator.Validate(dto);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithEmptyStudentId_ShouldFail()
        {
            var dto = new CreateViolationDto
            {
                StudentId = "",
                Violation = "Sử dụng bếp từ"
            };

            var (isValid, _) = CreateViolationValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}

