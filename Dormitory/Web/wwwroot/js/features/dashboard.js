/**
 * Feature: Dashboard UI
 */
const DashboardFeature = {
    async loadSummary() {
        return await Api.get('/api/dashboard/summary');
    },

    async resolveTask(taskId) {
        return await Api.post(`/api/dashboard/tasks/${taskId}/resolve`, {});
    }
};
window.DashboardFeature = DashboardFeature;

