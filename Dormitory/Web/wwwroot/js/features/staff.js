/**
 * Feature: Staff Management UI
 */
const StaffFeature = {
    async loadStaff(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/nhanvien?${query}`);
    },

    async createStaff(data) {
        return await Api.post('/api/nhanvien', data);
    },

    async toggleStatus(id) {
        return await Api.post(`/api/nhanvien/${id}/toggle-status`, {});
    }
};
window.StaffFeature = StaffFeature;

