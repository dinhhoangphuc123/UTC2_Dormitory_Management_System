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
                StudentName = "Trần Minh Hoàng",
                Mssv = "6451071012",
                RoomNumber = "101",
                BedNumber = "G1",
                MonthlyFee = 500000,
                DepositAmount = 500000
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
                StudentName = "Trần Minh Hoàng",
                Mssv = "6451071012",
                RoomNumber = "101",
                BedNumber = "G1",
                MonthlyFee = -100
            };

            var (isValid, _) = CreateContractValidator.Validate(req);
            Assert.False(isValid);
        }
    }
}

