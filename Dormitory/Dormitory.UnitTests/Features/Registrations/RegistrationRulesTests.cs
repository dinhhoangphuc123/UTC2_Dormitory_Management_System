using System;
using Dormitory.Web.Features.Registrations.Services;
using Xunit;

namespace Dormitory.UnitTests.Features.Registrations
{
    public class RegistrationRulesTests
    {
        [Fact]
        public void CalculateHoldExpiration_WithValidHours_ReturnsCorrectFutureTime()
        {
            var baseTime = new DateTime(2026, 10, 31, 10, 0, 0);
            var result = RegistrationRules.CalculateHoldExpiration(baseTime, 24);

            Assert.Equal(new DateTime(2026, 11, 1, 10, 0, 0), result);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-5)]
        public void CalculateHoldExpiration_WithZeroOrNegativeHours_DefaultsTo24Hours(int holdHours)
        {
            var baseTime = new DateTime(2026, 10, 31, 10, 0, 0);
            var result = RegistrationRules.CalculateHoldExpiration(baseTime, holdHours);

            Assert.Equal(new DateTime(2026, 11, 1, 10, 0, 0), result);
        }

        [Fact]
        public void CalculateInitialInvoiceAmount_CalculatesRentAndDeposit()
        {
            decimal monthlyRent = 650000m;
            int months = 1;
            decimal deposit = 100000m;

            var amount = RegistrationRules.CalculateInitialInvoiceAmount(monthlyRent, months, deposit);

            Assert.Equal(750000m, amount);
        }

        [Fact]
        public void CalculateInitialInvoiceAmount_HandlesZeroDepositAndDefaultMonths()
        {
            decimal monthlyRent = 500000m;

            var amount = RegistrationRules.CalculateInitialInvoiceAmount(monthlyRent, 0, -100m);

            Assert.Equal(500000m, amount);
        }

        [Fact]
        public void IsReservationExpired_ReturnsTrueWhenPastDeadline()
        {
            var deadline = new DateTime(2026, 10, 31, 10, 0, 0);
            var now = new DateTime(2026, 10, 31, 10, 0, 1);

            Assert.True(RegistrationRules.IsReservationExpired(deadline, now));
        }

        [Fact]
        public void IsReservationExpired_ReturnsFalseWhenStillValid()
        {
            var deadline = new DateTime(2026, 10, 31, 10, 0, 0);
            var now = new DateTime(2026, 10, 31, 9, 59, 59);

            Assert.False(RegistrationRules.IsReservationExpired(deadline, now));
        }

        [Fact]
        public void IsWarningDue_ReturnsTrueWhenWithinWarningThreshold()
        {
            var deadline = new DateTime(2026, 10, 31, 12, 0, 0);
            var now = new DateTime(2026, 10, 31, 10, 0, 0); // 2 hours remaining <= 3 hours

            Assert.True(RegistrationRules.IsWarningDue(deadline, now, 3));
        }

        [Fact]
        public void IsWarningDue_ReturnsFalseWhenMoreThanThresholdOrExpired()
        {
            var deadline = new DateTime(2026, 10, 31, 16, 0, 0);
            var now = new DateTime(2026, 10, 31, 10, 0, 0); // 6 hours remaining > 3 hours

            Assert.False(RegistrationRules.IsWarningDue(deadline, now, 3));

            var expiredDeadline = new DateTime(2026, 10, 31, 9, 0, 0);
            Assert.False(RegistrationRules.IsWarningDue(expiredDeadline, now, 3));
        }

        [Theory]
        [InlineData("tuChoi", null, null, null, RegistrationRules.StepTuChoi)]
        [InlineData("hetHan", null, null, null, RegistrationRules.StepHetHan)]
        [InlineData("choDuyet", null, null, null, RegistrationRules.StepChoDuyet)]
        public void ResolveRegistrationStep_ForEarlySteps_ReturnsExpectedStep(
            string donDangKyTrangThai,
            string? hopDongTrangThai,
            DateTime? hanGiuCho,
            DateTime? ngayNhanPhongThucTe,
            string expectedStep)
        {
            var now = new DateTime(2026, 10, 31, 10, 0, 0);
            var step = RegistrationRules.ResolveRegistrationStep(
                donDangKyTrangThai,
                hopDongTrangThai,
                hanGiuCho,
                ngayNhanPhongThucTe,
                now);

            Assert.Equal(expectedStep, step);
        }

        [Fact]
        public void ResolveRegistrationStep_WhenApprovedAndHolding_ReturnsDaDuyetChoThanhToan()
        {
            var now = new DateTime(2026, 10, 31, 10, 0, 0);
            var hanGiuCho = new DateTime(2026, 11, 1, 10, 0, 0);

            var step = RegistrationRules.ResolveRegistrationStep(
                "daDuyet",
                "choThanhToan",
                hanGiuCho,
                null,
                now);

            Assert.Equal(RegistrationRules.StepDaDuyetChoThanhToan, step);
        }

        [Fact]
        public void ResolveRegistrationStep_WhenHoldingExpired_ReturnsHetHan()
        {
            var now = new DateTime(2026, 10, 31, 12, 0, 0);
            var hanGiuCho = new DateTime(2026, 10, 31, 10, 0, 0); // Expired 2 hours ago

            var step = RegistrationRules.ResolveRegistrationStep(
                "daDuyet",
                "choThanhToan",
                hanGiuCho,
                null,
                now);

            Assert.Equal(RegistrationRules.StepHetHan, step);
        }

        [Fact]
        public void ResolveRegistrationStep_WhenActiveWithoutCheckIn_ReturnsDaThanhToanChuaNhanPhong()
        {
            var now = new DateTime(2026, 10, 31, 10, 0, 0);

            var step = RegistrationRules.ResolveRegistrationStep(
                "daDuyet",
                "hieuLuc",
                null,
                null,
                now);

            Assert.Equal(RegistrationRules.StepDaThanhToanChuaNhanPhong, step);
        }

        [Fact]
        public void ResolveRegistrationStep_WhenActiveWithCheckIn_ReturnsHoanTat()
        {
            var now = new DateTime(2026, 10, 31, 10, 0, 0);
            var checkInDate = new DateTime(2026, 10, 31);

            var step = RegistrationRules.ResolveRegistrationStep(
                "daDuyet",
                "hieuLuc",
                null,
                checkInDate,
                now);

            Assert.Equal(RegistrationRules.StepHoanTat, step);
        }
    }
}
