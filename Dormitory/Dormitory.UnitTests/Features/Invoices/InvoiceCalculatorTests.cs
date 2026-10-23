using Dormitory.Web.Features.Invoices.Services;

namespace Dormitory.UnitTests.Features.Invoices
{
    public class InvoiceCalculatorTests
    {
        [Fact]
        public void CalculateTotal_SumsProperly()
        {
            var total = InvoiceCalculator.CalculateTotal(500000, 100000, 50000, 20000);
            Assert.Equal(570000, total);
        }

        [Fact]
        public void CalculateLatePenalty_CalculatesCorrectly()
        {
            var penalty = InvoiceCalculator.CalculateLatePenalty(1000000, 10, 0.001m);
            Assert.Equal(10000, penalty);
        }

        [Fact]
        public void IsOverdue_DetectsOverdueDate()
        {
            var dueDate = DateTime.Today.AddDays(-5);
            Assert.True(InvoiceCalculator.IsOverdue(dueDate));
        }
    }
}

