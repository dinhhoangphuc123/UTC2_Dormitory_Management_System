using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Validators;

namespace Dormitory.UnitTests.Features.Payments
{
    public class ConfirmPaymentValidatorTests
    {
        [Fact]
        public void Validate_WithValidPayment_ShouldPass()
        {
            var dto = new ConfirmPaymentDto
            {
                InvoiceId = "HD-2026-001",
                PaymentMethod = "Tiền mặt"
            };

            var (isValid, errorMessage) = ConfirmPaymentValidator.Validate(dto);
            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_WithEmptyInvoiceId_ShouldFail()
        {
            var dto = new ConfirmPaymentDto
            {
                InvoiceId = "",
                PaymentMethod = "Tiền mặt"
            };

            var (isValid, _) = ConfirmPaymentValidator.Validate(dto);
            Assert.False(isValid);
        }
    }
}

