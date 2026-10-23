/**
 * Feature: Accounts Management UI
 */
const AccountsFeature = {
    async loadProfile() {
        return await Api.get('/api/auth/profile');
    }
};
window.AccountsFeature = AccountsFeature;

