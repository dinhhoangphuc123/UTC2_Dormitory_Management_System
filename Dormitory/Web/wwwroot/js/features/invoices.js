/**
 * Feature: Invoices & Fees UI
 */
const InvoicesFeature = {
    async loadInvoices(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await Api.get(`/api/hoadon?${query}`);
    },

    async createInvoice(data) {
        return await Api.post('/api/hoadon', data);
    },

    async confirmPayment(invoiceId, paymentMethod = 'Tiền mặt (BQL)') {
        return await Api.post('/api/hoadon/confirm-payment', { invoiceId, paymentMethod });
    },
};
window.InvoicesFeature = InvoicesFeature;
