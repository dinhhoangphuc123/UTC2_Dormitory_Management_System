namespace Dormitory.Web.Features.Invoices.Services
{
    public static class InvoiceCalculator
    {
        public static decimal CalculateTotal(decimal baseAmount, decimal additionalFees = 0, decimal discounts = 0, decimal penalty = 0)
        {
            decimal total = baseAmount + additionalFees + penalty - discounts;
            return Math.Max(0, total);
        }

        public static decimal CalculateLatePenalty(decimal amount, int daysOverdue, decimal dailyRate = 0.001m)
        {
            if (daysOverdue <= 0 || amount <= 0) return 0;
            return Math.Round(amount * daysOverdue * dailyRate, 0);
        }

        public static bool IsOverdue(DateTime dueDate, DateTime? paymentDate = null)
        {
            DateTime checkDate = paymentDate ?? DateTime.Today;
            return checkDate > dueDate;
        }
    }
}

