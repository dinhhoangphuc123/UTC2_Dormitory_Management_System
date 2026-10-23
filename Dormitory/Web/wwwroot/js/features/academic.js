/**
 * Feature: Academic & Classes Management UI
 */
const AcademicFeature = {
    async loadClasses(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/lophoc?${query}`);
    },

    async createClass(data) {
        return await Api.post('/api/lophoc', data);
    }
};
window.AcademicFeature = AcademicFeature;

