/**
 * Feature: Reports & Analytics UI
 */
const ReportsFeature = {
    async loadSummary(semester, scope) {
        const params = new URLSearchParams();
        if (semester) params.append('semester', semester);
        if (scope) params.append('scope', scope);
        return await Api.get(`/api/baocao/summary?${params.toString()}`);
    }
};
window.ReportsFeature = ReportsFeature;

