using Dormitory.Web.Features.Payments.Services;

namespace Dormitory.UnitTests.Features.Payments
{
    public class VietQrPayloadTests
    {
        [Theory]
        [InlineData("VietinBank", "970415")]
        [InlineData("Vietcombank", "970436")]
        [InlineData("970422", "970422")]
        [InlineData("BIDV", "970418")]
        public void NormalizeBankBin_MapsNamesToNapaaBins(string bankId, string expected)
        {
            Assert.Equal(expected, VietQrPayload.NormalizeBankBin(bankId));
        }

        [Fact]
        public void BuildPayload_ContainsBankAccountAmountAndValidCrc()
        {
            var payload = VietQrPayload.BuildPayload("VietinBank", "102800000001", "KTX UTC2", 500000, "HD-001");
            Assert.StartsWith("0002010102", payload);
            Assert.Contains("970415", payload);
            Assert.Contains("102800000001", payload);
            Assert.Contains("500000", payload);
            Assert.Contains("HD-001", payload);

            // CRC16 phải khớp với 4 ký tự cuối.
            var body = payload[..^4];
            var expectedCrc = VietQrPayload.ComputeCrc16(body);
            Assert.Equal(expectedCrc, payload[^4..]);
        }

        [Fact]
        public void BuildImageUrl_UsesNumericBankBin_NotBankName()
        {
            var url = VietQrPayload.BuildImageUrl("VietinBank", "102800000001", "KTX", 500000, "HD-1");
            Assert.Contains("970415-102800000001", url);
            Assert.Contains("amount=500000", url);
        }
    }
}
