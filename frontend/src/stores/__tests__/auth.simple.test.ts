import { useAuthStore } from '../auth';

describe('Auth Store Import', () => {
    it('should import auth store successfully', () => {
        expect(useAuthStore).toBeDefined();
        expect(typeof useAuthStore).toBe('function');
    });

    it('should have initial state', () => {
        const store = useAuthStore.getState();
        expect(store.user).toBe(null);
        expect(store.token).toBe(null);
        expect(store.isAuthenticated).toBe(false);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
    });
});