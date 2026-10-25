/**
 * Feature: Reports & Analytics UI
 */
const ReportsFeature = {
    async loadSummary(academicYear, scope) {
        const params = new URLSearchParams();
        if (academicYear) params.append('academicYear', academicYear);
        if (scope) params.append('scope', scope);
        return await Api.get(`/api/baocao/summary?${params.toString()}`);
    }
};
window.ReportsFeature = ReportsFeature;

