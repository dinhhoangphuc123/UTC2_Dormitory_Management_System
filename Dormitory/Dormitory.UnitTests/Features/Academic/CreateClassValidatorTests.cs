using Dormitory.Web.Features.Academic.DTOs;
using Dormitory.Web.Features.Academic.Validators;

namespace Dormitory.UnitTests.Features.Academic
{
    public class CreateClassValidatorTests
    {
        [Fact]
        public void Validate_WithValidClass_ShouldPass()
        {
            var dto = new CreateClassDto
            {
                Code = "CNTT01_K65",
                Name = "Công nghệ Thông tin 01",
                Faculty = "CNTT",
                Cohort = "k65"
            };

            var (isValid, errorMessage) = CreateClassValidator.Validate(dto);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithEmptyCode_ShouldFail()
        {
            var dto = new CreateClassDto
            {
                Code = "",
                Name = "Lớp Test"
            };

            var (isValid, _) = CreateClassValidator.Validate(dto);
            Assert.False(isValid);
        }

        [Fact]
        public void Validate_WithInvalidCohort_ShouldFail()
        {
            var dto = new CreateClassDto
            {
                Code = "CNTT01",
                Name = "Lớp Test",
                Faculty = "CNTT",
                Cohort = "KXX"
            };

            var (isValid, _) = CreateClassValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}
