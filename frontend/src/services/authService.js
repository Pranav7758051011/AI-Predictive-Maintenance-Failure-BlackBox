import { apiRequest, setTokens, clearTokens } from './api';

export const authService = {
  async register(userData) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: userData
    });
    return data;
  },

  async login(email, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data?.access_token) {
      setTokens(data.access_token, data.refresh_token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      clearTokens();
    }
  },

  async getCurrentUser() {
    return await apiRequest('/api/auth/me', { method: 'GET' });
  },

  async getProfile() {
    return await apiRequest('/api/users/profile', { method: 'GET' });
  },

  async updateProfile(profileData) {
    return await apiRequest('/api/users/profile', {
      method: 'PUT',
      body: profileData
    });
  },

  async changePassword(currentPassword, newPassword) {
    return await apiRequest('/api/users/change-password', {
      method: 'PUT',
      body: {
        current_password: currentPassword,
        new_password: newPassword
      }
    });
  }
};
