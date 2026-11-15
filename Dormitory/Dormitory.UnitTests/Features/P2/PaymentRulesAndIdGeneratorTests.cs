using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.UnitTests.Features.P2
{
    public class PaymentRulesAndIdGeneratorTests
    {
        [Theory]
        [InlineData("VNPay", "viDienTu")]
        [InlineData("Chuyen Khoan", "chuyenKhoan")]
        [InlineData("Tiền Mặt", "tienMat")]
        [InlineData("cash", null)]
        public void NormalizePaymentMethod_MapsCorrectly(string input, string? expected)
        {
            Assert.Equal(expected, PaymentRules.NormalizePaymentMethod(input));
        }

        [Fact]
        public void CalculateInvoiceTotal_AndOutstanding_Works()
        {
            var total = PaymentRules.CalculateInvoiceTotal(new[]
            {
                new ValueTuple<decimal?, decimal, decimal>(100000m, 1m, 100000m),
                new ValueTuple<decimal?, decimal, decimal>(null, 2m, 50000m)
            });
            Assert.Equal(200000, total);
            Assert.Equal(150000, PaymentRules.CalculateOutstanding(total, 50000));
            Assert.Equal(0, PaymentRules.CalculateOutstanding(total, 250000));
        }

        [Fact]
        public void IdGenerator_ProducesUniqueIds()
        {
            var ids = new HashSet<string>();
            for (int i = 0; i < 200; i++)
            {
                ids.Add(IdGenerator.Next("TT"));
            }
            Assert.Equal(200, ids.Count);
            Assert.All(ids, id => Assert.StartsWith("TT-", id));
        }
    }
}
