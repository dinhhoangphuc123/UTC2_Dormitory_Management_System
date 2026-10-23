using Dormitory.Web.Features.Contracts.Services;

namespace Dormitory.UnitTests.Features.Contracts
{
    public class ContractRulesTests
    {
        [Fact]
        public void IsBedAvailable_WhenStatusIsVacant_ReturnsTrue()
        {
            Assert.True(ContractRules.IsBedAvailable("Giường trống"));
        }

        [Fact]
        public void IsBedAvailable_WhenOccupied_ReturnsFalse()
        {
            Assert.False(ContractRules.IsBedAvailable("Đang ở"));
        }

        [Fact]
        public void IsGenderCompatible_WhenMatching_ReturnsTrue()
        {
            Assert.True(ContractRules.IsGenderCompatible("nam", "nam"));
            Assert.True(ContractRules.IsGenderCompatible("nu", "nu"));
        }

        [Fact]
        public void IsGenderCompatible_WhenMismatch_ReturnsFalse()
        {
            Assert.False(ContractRules.IsGenderCompatible("nam", "nu"));
        }

        [Fact]
        public void HasTimeOverlap_DetectsOverlap()
        {
            var start1 = new DateTime(2026, 9, 1);
            var end1 = new DateTime(2027, 1, 15);
            var start2 = new DateTime(2026, 12, 1);
            var end2 = new DateTime(2027, 6, 30);

            Assert.True(ContractRules.HasTimeOverlap(start1, end1, start2, end2));
        }

        [Fact]
        public void CalculateDepositRefund_DeductsCorrectly()
        {
            var refund = ContractRules.CalculateDepositRefund(500000, 100000);
            Assert.Equal(400000, refund);
        }
    }
}

