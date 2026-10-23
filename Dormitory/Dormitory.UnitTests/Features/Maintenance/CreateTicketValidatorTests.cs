using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Validators;

namespace Dormitory.UnitTests.Features.Maintenance
{
    public class CreateTicketValidatorTests
    {
        [Fact]
        public void Validate_WithValidTicket_ShouldPass()
        {
            var dto = new CreateTicketDto
            {
                StudentId = "6451071012",
                Description = "Hỏng đèn tuýp"
            };

            var (isValid, errorMessage) = CreateTicketValidator.Validate(dto);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithEmptyStudentId_ShouldFail()
        {
            var dto = new CreateTicketDto
            {
                StudentId = string.Empty,
                Description = "Hỏng đèn tuýp"
            };

            var (isValid, _) = CreateTicketValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}
