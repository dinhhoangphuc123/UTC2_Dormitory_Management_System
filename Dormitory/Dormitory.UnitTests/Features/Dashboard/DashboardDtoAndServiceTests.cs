using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Dashboard.DTOs;
using Dormitory.Web.Features.Dashboard.Services;

namespace Dormitory.UnitTests.Features.Dashboard
{
    public class DashboardDtoAndServiceTests
    {
        [Fact]
        public void DashboardSummaryDto_Defaults_AreNonNullAndZeroStateSafe()
        {
            var dto = new DashboardSummaryDto();

            Assert.NotNull(dto.CohortGenderStats);
            Assert.Empty(dto.CohortGenderStats);

            Assert.NotNull(dto.MonthlyRevenueStats);
            Assert.Empty(dto.MonthlyRevenueStats);

            Assert.NotNull(dto.RepairCategoryStats);
            Assert.Empty(dto.RepairCategoryStats);

            Assert.NotNull(dto.ZoneOccupancies);
            Assert.NotNull(dto.UrgentTasks);

            Assert.Equal(0, dto.TotalStudents);
            Assert.Equal(0m, dto.TotalFeeRevenue);
            Assert.Equal(0, dto.PendingApplicationsCount);
            Assert.Equal(0, dto.RepairRequestsCount);
        }

        [Fact]
        public void CohortGenderStatDto_CalculatesTotalsAndPercentagesCorrectly()
        {
            var stat = new CohortGenderStatDto
            {
                CohortName = "K64",
                Year = 2023,
                MaleCount = 60,
                FemaleCount = 40
            };

            Assert.Equal(100, stat.TotalCount);
            Assert.Equal(60.0, stat.MalePercent);
            Assert.Equal(40.0, stat.FemalePercent);
        }

        [Fact]
        public void CohortGenderStatDto_ZeroCount_DoesNotThrowDivideByZero()
        {
            var stat = new CohortGenderStatDto
            {
                CohortName = "K66",
                Year = 2025,
                MaleCount = 0,
                FemaleCount = 0
            };

            Assert.Equal(0, stat.TotalCount);
            Assert.Equal(0.0, stat.MalePercent);
            Assert.Equal(0.0, stat.FemalePercent);
        }
    }
}
