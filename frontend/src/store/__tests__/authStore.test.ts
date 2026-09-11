import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { User } from '@/types';

const mockUser: User = {
  id: 'usr_123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  role: 'user',
  plan: 'free',
  is_active: true,
  is_email_verified: true,
  storage_used_bytes: 0,
  ai_requests_used: 0,
  conversions_used: 0,
};

describe('authStore Zustand store', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initializes with logged-out state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('sets authentication state properly', () => {
    useAuthStore.getState().setAuth(mockUser, 'access_token_abc', 'refresh_token_xyz');
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@example.com');
    expect(state.accessToken).toBe('access_token_abc');
    expect(state.refreshToken).toBe('refresh_token_xyz');
  });

  it('clears state on logout', () => {
    useAuthStore.getState().setAuth(mockUser, 'token1', 'token2');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
