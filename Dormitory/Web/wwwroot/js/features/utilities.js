/**
 * Feature: Utilities & Services UI
 */
const UtilitiesFeature = {
    async loadUtilities(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/diennuoc?${query}`);
    },

    async recordUtility(data) {
        return await Api.post('/api/diennuoc/record', data);
    }
};
window.UtilitiesFeature = UtilitiesFeature;

