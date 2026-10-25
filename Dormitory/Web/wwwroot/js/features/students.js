/**
 * Feature: Students Management UI
 */
const StudentsFeature = {
    async loadStudents(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/sinhvien?${query}`);
    }
};
window.StudentsFeature = StudentsFeature;

