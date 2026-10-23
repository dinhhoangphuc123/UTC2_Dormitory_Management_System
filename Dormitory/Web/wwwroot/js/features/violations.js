/**
 * Feature: Violations & Discipline UI
 */
const ViolationsFeature = {
    async loadViolations(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/vipham?${query}`);
    },

    async createViolation(data) {
        return await Api.post('/api/vipham', data);
    },
};
window.ViolationsFeature = ViolationsFeature;
