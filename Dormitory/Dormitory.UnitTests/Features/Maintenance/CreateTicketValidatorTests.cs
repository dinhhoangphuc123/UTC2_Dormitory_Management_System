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
                Building = "A1",
                Room = "101",
                Reporter = "Nguyễn Văn A",
                Description = "Hỏng đèn tuýp"
            };

            var (isValid, errorMessage) = CreateTicketValidator.Validate(dto);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithEmptyRoom_ShouldFail()
        {
            var dto = new CreateTicketDto
            {
                Building = "A1",
                Room = "",
                Reporter = "Nguyễn Văn A",
                Description = "Hỏng đèn tuýp"
            };

            var (isValid, _) = CreateTicketValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}

