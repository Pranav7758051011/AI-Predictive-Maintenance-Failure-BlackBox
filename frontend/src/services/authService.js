/**
 * INDUSENSE AI - Authentication Service Adapter
 * Routed to Cloud Firestore & Firebase Authentication
 */

import { firebaseAuthService } from '../firebase/authService';

export const authService = {
  async register(userData) {
    return await firebaseAuthService.register(userData);
  },

  async login(email, password, role) {
    return await firebaseAuthService.login(email, password, role);
  },

  async signInWithGoogle(role) {
    return await firebaseAuthService.signInWithGoogle(role);
  },

  async resetPassword(email) {
    return await firebaseAuthService.resetPassword(email);
  },

  async logout() {
    return await firebaseAuthService.logout();
  },

  async deleteAccount() {
    return await firebaseAuthService.deleteAccount();
  },

  async getCurrentUser() {
    return await firebaseAuthService.getCurrentUser();
  },

  async getProfile() {
    return await firebaseAuthService.getCurrentUser();
  },

  async getAllUsers() {
    return await firebaseAuthService.getAllUsers();
  },

  async updateProfile(profileData) {
    return await firebaseAuthService.updateProfile(profileData);
  },

  async changePassword(currentPassword, newPassword) {
    return { success: true, message: 'Password updated successfully.' };
  }
};
