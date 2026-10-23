using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Validators;

namespace Dormitory.UnitTests.Features.Contracts
{
    public class CreateContractValidatorTests
    {
        [Fact]
        public void Validate_WithValidContract_ShouldPass()
        {
            var req = new CreateContractRequestDto
            {
                Mssv = "6451071012",
                BedId = "A01_101_G01",
                MonthlyFee = 500000,
                DepositAmount = 500000,
                StartDate = "2026-09-01",
                EndDate = "2027-01-31"
            };

            var (isValid, errorMessage) = CreateContractValidator.Validate(req);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithNegativeMonthlyFee_ShouldFail()
        {
            var req = new CreateContractRequestDto
            {
                Mssv = "6451071012",
                BedId = "A01_101_G01",
                MonthlyFee = -100
            };

            var (isValid, _) = CreateContractValidator.Validate(req);
            Assert.False(isValid);
        }
    }
}
