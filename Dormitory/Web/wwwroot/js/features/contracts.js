/**
 * Feature: Contracts Management UI
 */
const ContractsFeature = {
    async loadContracts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/hopdong?${query}`);
    },

    async createContract(data) {
        return await Api.post('/api/hopdong', data);
    },

    async renewContract(id, months = 5) {
        return await Api.post(`/api/hopdong/${id}/renew?months=${months}`, {});
    },

    async liquidateContract(id, reason) {
        return await Api.post(`/api/hopdong/${id}/liquidate`, { reason });
    }
};
window.ContractsFeature = ContractsFeature;

