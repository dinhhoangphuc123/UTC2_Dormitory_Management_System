using Dormitory.Web.Features.Utilities.Services;

namespace Dormitory.UnitTests.Features.Utilities
{
    public class UtilityBillCalculatorTests
    {
        [Fact]
        public void CalculateElectricityCost_CalculatesAccurately()
        {
            var cost = UtilityBillCalculator.CalculateElectricityCost(100, 2500);
            Assert.Equal(250000, cost);
        }

        [Fact]
        public void CalculateWaterCost_CalculatesAccurately()
        {
            var cost = UtilityBillCalculator.CalculateWaterCost(10, 12000);
            Assert.Equal(120000, cost);
        }

        [Fact]
        public void SplitCostPerPerson_SplitsEvenly()
        {
            var perPerson = UtilityBillCalculator.SplitCostPerPerson(400000, 8);
            Assert.Equal(50000, perPerson);
        }

        [Fact]
        public void SplitCostByDays_CalculatesProRata()
        {
            var cost = UtilityBillCalculator.SplitCostByDays(300000, 30, 15);
            Assert.Equal(150000, cost);
        }
    }
}

