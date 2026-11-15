namespace Dormitory.Web.Features.Utilities.Services
{
    /// <summary>
    /// Công thức tiền điện nước dùng chung cho mọi nơi tính phí điện nước:
    /// tính tiền theo lượng tiêu thụ và chia đều theo số người.
    /// </summary>
    public static class UtilityBillCalculator
    {
        public static decimal CalculateElectricityCost(decimal usageKwh, decimal pricePerKwh)
        {
            if (usageKwh <= 0 || pricePerKwh <= 0) return 0;
            return Math.Round(usageKwh * pricePerKwh, 0);
        }

        public static decimal CalculateElectricityCost(int usageKwh, decimal pricePerKwh) =>
            CalculateElectricityCost((decimal)usageKwh, pricePerKwh);

        public static decimal CalculateWaterCost(decimal usageM3, decimal pricePerM3)
        {
            if (usageM3 <= 0 || pricePerM3 <= 0) return 0;
            return Math.Round(usageM3 * pricePerM3, 0);
        }

        public static decimal CalculateWaterCost(int usageM3, decimal pricePerM3) =>
            CalculateWaterCost((decimal)usageM3, pricePerM3);

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
