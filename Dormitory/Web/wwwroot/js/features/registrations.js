/**
 * Feature: Registrations / Admissions UI
 */
const RegistrationsFeature = {
    async loadApplications(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/dondangky?${query}`);
    },

    async approveApplication(id) {
        return await Api.post(`/api/dondangky/${id}/approve`, {});
    },

    async rejectApplication(id, reason) {
        return await Api.post(`/api/dondangky/${id}/reject`, { reason });
    }
};
window.RegistrationsFeature = RegistrationsFeature;

