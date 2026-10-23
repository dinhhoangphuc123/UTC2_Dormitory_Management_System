/**
 * Feature: Maintenance & Repairs UI
 */
const MaintenanceFeature = {
    async loadTickets(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/suachua?${query}`);
    },

    async createTicket(data) {
        return await Api.post('/api/suachua', data);
    },

    async assignTicket(data) {
        return await Api.post('/api/suachua/assign', data);
    },

    async completeTicket(id) {
        return await Api.post(`/api/suachua/${id}/complete`, {});
    }
};
window.MaintenanceFeature = MaintenanceFeature;

