using System;
using System.Collections.Generic;
using Dormitory.Web.Features.Buildings.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Features.Students.Entities;
using Xunit;

namespace Dormitory.UnitTests.Features.StudentPortal
{
    public class StudentPortalRulesTests
    {
        [Fact]
        public void ResolveDashboardRegistrationState_NoContractsOrApps_ReturnsChuaDangKy()
        {
            var now = new DateTime(2026, 10, 31);
            var state = StudentPortalRules.ResolveDashboardRegistrationState(null, null, null, null, now);
            Assert.Equal(StudentPortalRules.StateChuaDangKy, state);
        }

        [Fact]
        public void ResolveDashboardRegistrationState_WhenContractActiveAndCheckedIn_ReturnsDangO()
        {
            var now = new DateTime(2026, 10, 31);
            var checkIn = new DateTime(2026, 9, 1);
            var state = StudentPortalRules.ResolveDashboardRegistrationState("daDuyet", "hieuLuc", null, checkIn, now);
            Assert.Equal(StudentPortalRules.StateDangO, state);
        }

        [Fact]
        public void ResolveDashboardRegistrationState_WhenContractActiveNotCheckedIn_ReturnsDaThanhToanChoNhanPhong()
        {
            var now = new DateTime(2026, 10, 31);
            var state = StudentPortalRules.ResolveDashboardRegistrationState("daDuyet", "hieuLuc", null, null, now);
            Assert.Equal(StudentPortalRules.StateDaThanhToanChoNhanPhong, state);
        }

        [Fact]
        public void ResolveDashboardRegistrationState_WhenHoldingAndValid_ReturnsChoThanhToan()
        {
            var now = new DateTime(2026, 10, 31, 10, 0, 0);
            var deadline = new DateTime(2026, 11, 1, 10, 0, 0);
            var state = StudentPortalRules.ResolveDashboardRegistrationState("daDuyet", "choThanhToan", deadline, null, now);
            Assert.Equal(StudentPortalRules.StateChoThanhToan, state);
        }

        [Fact]
        public void ResolveDashboardRegistrationState_WhenHoldingExpired_ReturnsHetHan()
        {
            var now = new DateTime(2026, 10, 31, 12, 0, 0);
            var deadline = new DateTime(2026, 10, 31, 10, 0, 0);
            var state = StudentPortalRules.ResolveDashboardRegistrationState("daDuyet", "choThanhToan", deadline, null, now);
            Assert.Equal(StudentPortalRules.StateHetHan, state);
        }

        [Theory]
        [InlineData("choDuyet", StudentPortalRules.StateChoDuyet)]
        [InlineData("tuChoi", StudentPortalRules.StateBiTuChoi)]
        [InlineData("hetHan", StudentPortalRules.StateHetHan)]
        public void ResolveDashboardRegistrationState_AppOnlyStatuses_ReturnExpected(string appStatus, string expected)
        {
            var now = new DateTime(2026, 10, 31);
            var state = StudentPortalRules.ResolveDashboardRegistrationState(appStatus, null, null, null, now);
            Assert.Equal(expected, state);
        }

        [Fact]
        public void CheckRoundEligibility_WhenAllValid_ReturnsEligible()
        {
            var student = new SinhVien { TrangThai = "dangHoc" };
            var round = new DotDangKy
            {
                NgayMo = new DateTime(2026, 10, 1),
                NgayDong = new DateTime(2026, 11, 1)
            };
            var now = new DateTime(2026, 10, 15);

            var (eligible, reasons) = StudentPortalRules.CheckRoundEligibility(
                student, round, hasActiveContract: false, hasApplicationInRound: false, hasGenderBuilding: true, now);

            Assert.True(eligible);
            Assert.Empty(reasons);
        }

        [Fact]
        public void CheckRoundEligibility_WhenStudentNotActive_ReturnsIneligible()
        {
            var student = new SinhVien { TrangThai = "daTotNghiep" };
            var round = new DotDangKy
            {
                NgayMo = new DateTime(2026, 10, 1),
                NgayDong = new DateTime(2026, 11, 1)
            };
            var now = new DateTime(2026, 10, 15);

            var (eligible, reasons) = StudentPortalRules.CheckRoundEligibility(
                student, round, hasActiveContract: false, hasApplicationInRound: false, hasGenderBuilding: true, now);

            Assert.False(eligible);
            Assert.Contains(reasons, r => r.Contains("không trong trạng thái đang học"));
        }

        [Fact]
        public void CheckRoundEligibility_WhenHasActiveContract_ReturnsIneligible()
        {
            var student = new SinhVien { TrangThai = "dangHoc" };
            var round = new DotDangKy
            {
                NgayMo = new DateTime(2026, 10, 1),
                NgayDong = new DateTime(2026, 11, 1)
            };
            var now = new DateTime(2026, 10, 15);

            var (eligible, reasons) = StudentPortalRules.CheckRoundEligibility(
                student, round, hasActiveContract: true, hasApplicationInRound: false, hasGenderBuilding: true, now);

            Assert.False(eligible);
            Assert.Contains(reasons, r => r.Contains("hợp đồng nội trú"));
        }

        [Fact]
        public void CheckRoomSelectability_WhenGenderMismatch_ReturnsSaiGioiTinh()
        {
            var building = new ToaNha { GioiTinhQuyDinh = "nu", TrangThai = "hoatDong" };
            var room = new Phong { ToaNha = building, TrangThai = "hoatDong" };

            var (selectable, reason) = StudentPortalRules.CheckRoomSelectability(room, availableBedsCount: 2, studentGender: "nam");

            Assert.False(selectable);
            Assert.Equal("saiGioiTinh", reason);
        }

        [Fact]
        public void CheckRoomSelectability_WhenMaintenance_ReturnsBaoTri()
        {
            var building = new ToaNha { GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" };
            var room = new Phong { ToaNha = building, TrangThai = "baoTri" };

            var (selectable, reason) = StudentPortalRules.CheckRoomSelectability(room, availableBedsCount: 2, studentGender: "nam");

            Assert.False(selectable);
            Assert.Equal("baoTri", reason);
        }

        [Fact]
        public void CheckRoomSelectability_WhenNoBeds_ReturnsHetGiuong()
        {
            var building = new ToaNha { GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" };
            var room = new Phong { ToaNha = building, TrangThai = "hoatDong" };

            var (selectable, reason) = StudentPortalRules.CheckRoomSelectability(room, availableBedsCount: 0, studentGender: "nam");

            Assert.False(selectable);
            Assert.Equal("hetGiuong", reason);
        }

        [Fact]
        public void CheckRoomSelectability_WhenValid_ReturnsSelectable()
        {
            var building = new ToaNha { GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" };
            var room = new Phong { ToaNha = building, TrangThai = "hoatDong" };

            var (selectable, reason) = StudentPortalRules.CheckRoomSelectability(room, availableBedsCount: 2, studentGender: "nam");

            Assert.True(selectable);
            Assert.Null(reason);
        }
    }
}
