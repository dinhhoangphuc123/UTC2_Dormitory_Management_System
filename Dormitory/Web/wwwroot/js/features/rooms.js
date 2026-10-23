/**
 * Feature: Rooms Management UI
 */
const RoomsFeature = {
    async loadRooms(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/phong?${query}`);
    },

    async toggleBedMaintenance(bedId) {
        return await Api.post(`/api/phong/beds/${bedId}/toggle-maintenance`, {});
    }
};
window.RoomsFeature = RoomsFeature;

