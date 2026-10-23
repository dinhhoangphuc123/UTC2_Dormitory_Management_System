namespace Dormitory.Web.Features.Contracts.Services
{
    public static class ContractRules
    {
        public static bool IsBedAvailable(string bedStatus)
        {
            return bedStatus.Equals("Giường trống", StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsGenderCompatible(string studentGender, string buildingGender)
        {
            if (buildingGender.Equals("nam", StringComparison.OrdinalIgnoreCase) && studentGender.Equals("nam", StringComparison.OrdinalIgnoreCase))
                return true;
            if (buildingGender.Equals("nu", StringComparison.OrdinalIgnoreCase) && studentGender.Equals("nu", StringComparison.OrdinalIgnoreCase))
                return true;
            if (buildingGender.Equals("tatCa", StringComparison.OrdinalIgnoreCase) || buildingGender.Equals("honHop", StringComparison.OrdinalIgnoreCase))
                return true;
            return false;
        }

        public static bool HasTimeOverlap(DateTime start1, DateTime end1, DateTime start2, DateTime end2)
        {
            return start1 < end2 && start2 < end1;
        }

        public static decimal CalculateDepositRefund(decimal originalDeposit, decimal deductions = 0)
        {
            return Math.Max(0, originalDeposit - deductions);
        }
    }
}

