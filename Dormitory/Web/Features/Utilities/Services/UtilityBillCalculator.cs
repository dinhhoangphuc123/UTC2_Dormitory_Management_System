namespace Dormitory.Web.Features.Utilities.Services
{
    public static class UtilityBillCalculator
    {
        public static decimal CalculateElectricityCost(int usageKwh, decimal pricePerKwh)
        {
            if (usageKwh <= 0 || pricePerKwh <= 0) return 0;
            return usageKwh * pricePerKwh;
        }

        public static decimal CalculateWaterCost(int usageM3, decimal pricePerM3)
        {
            if (usageM3 <= 0 || pricePerM3 <= 0) return 0;
            return usageM3 * pricePerM3;
        }

        public static decimal SplitCostPerPerson(decimal totalCost, int residentCount)
        {
            if (totalCost <= 0 || residentCount <= 0) return 0;
            return Math.Round(totalCost / residentCount, 0);
        }

        public static decimal SplitCostByDays(decimal totalCost, int totalDaysInMonth, int stayedDays)
        {
            if (totalCost <= 0 || totalDaysInMonth <= 0 || stayedDays <= 0) return 0;
            return Math.Round(totalCost * stayedDays / totalDaysInMonth, 0);
        }
    }
}

