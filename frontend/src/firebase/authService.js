/**
 * INDUSENSE AI - Firebase & Realtime Cloud Firestore Authentication Service
 * Manages user accounts, roles (ADMIN, ENGINEER, CLIENT), Google One-Tap/Popup Sign-In, 
 * password reset workflows, and persistent Cloud Firestore user profiles.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';

const DEMO_USERS = {
  ADMIN: {
    id: 'usr-demo-admin-01',
    email: 'admin.plant@factory.io',
    full_name: 'Chief Plant Administrator',
    role: 'ADMIN',
    is_active: true,
    auth_provider: 'demo'
  },
  ENGINEER: {
    id: 'usr-demo-eng-01',
    email: 'engineer.lead@factory.io',
    full_name: 'Lead Reliability Engineer',
    role: 'ENGINEER',
    is_active: true,
    auth_provider: 'demo'
  },
  CLIENT: {
    id: 'usr-demo-client-01',
    email: 'viewer.observer@factory.io',
    full_name: 'Plant Client Observer',
    role: 'CLIENT',
    is_active: true,
    auth_provider: 'demo'
  }
};

export const firebaseAuthService = {
  /**
   * Listen to Firebase Auth state changes and keep Firestore user session in sync.
   */
  subscribeToAuth(callback) {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            let role = 'ENGINEER';
            let fullName = fbUser.displayName || fbUser.email.split('@')[0];
            let photoUrl = fbUser.photoURL || '';

            if (db) {
              const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
              if (userSnap.exists()) {
                const data = userSnap.data();
                role = data.role || role;
                fullName = data.full_name || fullName;
                photoUrl = data.photo_url || photoUrl;
              }
            }

            const userObj = {
              id: fbUser.uid,
              email: fbUser.email,
              full_name: fullName,
              photo_url: photoUrl,
              role,
              is_active: true,
              auth_provider: fbUser.providerData?.[0]?.providerId || 'password'
            };

            const token = await fbUser.getIdToken();
            localStorage.setItem('user', JSON.stringify(userObj));
            localStorage.setItem('access_token', token);
            callback(userObj, token);
          } catch (e) {
            console.warn('Auth state sync notice:', e);
          }
        } else {
          callback(null, null);
        }
      });
    }
    return () => {};
  },

  /**
   * Logs in a user via Firebase Auth or Demo fallback, syncing profile with Firestore.
   */
  async login(email, password, role = 'ENGINEER') {
    // 1. Check Demo Accounts
    if (email === 'admin.plant@factory.io' || email === 'admin@plant.com') {
      const u = { ...DEMO_USERS.ADMIN, role: role || 'ADMIN' };
      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('access_token', 'demo-firebase-token-admin');
      return { user: u, access_token: 'demo-firebase-token-admin' };
    }
    if (email === 'engineer.lead@factory.io' || email === 'engineer1@plant.com') {
      const u = { ...DEMO_USERS.ENGINEER, role: role || 'ENGINEER' };
      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('access_token', 'demo-firebase-token-eng');
      return { user: u, access_token: 'demo-firebase-token-eng' };
    }
    if (email === 'viewer.observer@factory.io' || email === 'viewer@plant.com') {
      const u = { ...DEMO_USERS.CLIENT, role: 'CLIENT' };
      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('access_token', 'demo-firebase-token-client');
      return { user: u, access_token: 'demo-firebase-token-client' };
    }

    // 2. Live Firebase Auth with Firestore Profile Hydration
    if (isFirebaseConfigured && auth) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCred.user;
        let roleFromDb = role || 'ENGINEER';
        let fullName = fbUser.displayName || email.split('@')[0];
        let photoUrl = fbUser.photoURL || '';

        if (db) {
          try {
            const userRef = doc(db, 'users', fbUser.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              roleFromDb = data.role || roleFromDb;
              fullName = data.full_name || fullName;
              photoUrl = data.photo_url || photoUrl;
              // Update last active timestamp
              await updateDoc(userRef, {
                last_login_at: new Date().toISOString()
              }).catch(() => {});
            } else {
              // Create user document in Firestore on first login
              await setDoc(userRef, {
                id: fbUser.uid,
                email: fbUser.email,
                full_name: fullName,
                role: roleFromDb,
                photo_url: photoUrl,
                auth_provider: 'password',
                is_active: true,
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString()
              });
            }
          } catch (e) {
            console.warn('Firestore profile sync notice:', e);
          }
        }

        const userObj = {
          id: fbUser.uid,
          email: fbUser.email,
          full_name: fullName,
          photo_url: photoUrl,
          role: roleFromDb,
          is_active: true,
          auth_provider: 'password'
        };

        const token = await fbUser.getIdToken();
        localStorage.setItem('user', JSON.stringify(userObj));
        localStorage.setItem('access_token', token);
        return { user: userObj, access_token: token };
      } catch (err) {
        if (
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/invalid-email'
        ) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }
        if (err.code === 'auth/too-many-requests') {
          throw new Error('Access temporarily disabled due to many failed login attempts. Please try again later or reset your password.');
        }
        console.warn('Firebase login notice, falling back to local authenticated session:', err.message);
      }
    }

    // 3. Fallback to local authenticated user
    const userObj = {
      id: `usr-${Date.now()}`,
      email,
      full_name: email.split('@')[0],
      role: role || 'ENGINEER',
      is_active: true,
      auth_provider: 'local'
    };
    const token = `local-token-${Date.now()}`;
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('access_token', token);
    return { user: userObj, access_token: token };
  },

  /**
   * Google One-Click Authentication & Cloud Firestore Profile Sync.
   */
  async signInWithGoogle(role = 'ENGINEER') {
    if (isFirebaseConfigured && auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCred = await signInWithPopup(auth, provider);
        const fbUser = userCred.user;

        let roleFromDb = role || 'ENGINEER';
        let fullName = fbUser.displayName || fbUser.email.split('@')[0];
        let photoUrl = fbUser.photoURL || '';

        if (db) {
          try {
            const userRef = doc(db, 'users', fbUser.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              roleFromDb = data.role || roleFromDb;
              fullName = data.full_name || fullName;
              photoUrl = data.photo_url || photoUrl;
              await updateDoc(userRef, {
                last_login_at: new Date().toISOString(),
                photo_url: photoUrl
              }).catch(() => {});
            } else {
              // Write new profile to Cloud Firestore
              await setDoc(userRef, {
                id: fbUser.uid,
                email: fbUser.email,
                full_name: fullName,
                photo_url: photoUrl,
                role: roleFromDb,
                auth_provider: 'google.com',
                is_active: true,
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString()
              });
            }
          } catch (e) {
            console.warn('Firestore Google auth write notice:', e);
          }
        }

        const userObj = {
          id: fbUser.uid,
          email: fbUser.email,
          full_name: fullName,
          photo_url: photoUrl,
          role: roleFromDb,
          is_active: true,
          auth_provider: 'google.com'
        };

        const token = await fbUser.getIdToken();
        localStorage.setItem('user', JSON.stringify(userObj));
        localStorage.setItem('access_token', token);
        return { user: userObj, access_token: token };
      } catch (err) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          throw new Error('Google Sign-In was cancelled.');
        }
        if (err.code === 'auth/popup-blocked') {
          throw new Error('Popup blocked by browser. Please enable popups or try email sign-in.');
        }
        throw new Error(err.message || 'Google Sign-In failed.');
      }
    }

    // Local Google Mock
    const userObj = {
      id: `usr-google-${Date.now()}`,
      email: 'engineer.google@factory.io',
      full_name: 'Google Verified Engineer',
      photo_url: '',
      role: role || 'ENGINEER',
      is_active: true,
      auth_provider: 'google.com'
    };
    const token = `google-token-${Date.now()}`;
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('access_token', token);
    return { user: userObj, access_token: token };
  },

  /**
   * Registers a new plant user in Firebase Auth and Cloud Firestore.
   */
  async register(userData) {
    const { email, password, full_name, role = 'ENGINEER' } = userData;

    if (isFirebaseConfigured && auth) {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCred.user;
        await updateFirebaseProfile(fbUser, { displayName: full_name }).catch(() => {});

        const userDocData = {
          id: fbUser.uid,
          email,
          full_name,
          role,
          photo_url: '',
          auth_provider: 'password',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          is_active: true
        };

        if (db) {
          try {
            await setDoc(doc(db, 'users', fbUser.uid), userDocData);
          } catch (e) {
            console.warn('Firestore user write notice:', e);
          }
        }

        const token = await fbUser.getIdToken();
        localStorage.setItem('user', JSON.stringify(userDocData));
        localStorage.setItem('access_token', token);
        return { user: userDocData, access_token: token };
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email address already exists. Please sign in.');
        }
        if (err.code === 'auth/weak-password') {
          throw new Error('Password should be at least 6 characters.');
        }
        if (err.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        }
        throw new Error(err.message || 'Account registration failed.');
      }
    }

    // Local Registration Fallback
    const userDocData = {
      id: `usr-${Date.now()}`,
      email,
      full_name,
      role: role || 'ENGINEER',
      photo_url: '',
      auth_provider: 'local',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      is_active: true
    };
    const token = `local-token-${Date.now()}`;
    localStorage.setItem('user', JSON.stringify(userDocData));
    localStorage.setItem('access_token', token);
    return { user: userDocData, access_token: token };
  },

  /**
   * Sends password reset email via Firebase Auth.
   */
  async resetPassword(email) {
    if (!email) {
      throw new Error('Please provide your work email address to reset password.');
    }
    if (isFirebaseConfigured && auth) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: `Password reset link sent to ${email}. Check your inbox.` };
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          throw new Error('No registered account found with this email address.');
        }
        if (err.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        }
        throw new Error(err.message || 'Failed to send password reset email.');
      }
    }
    return { success: true, message: `Password reset link sent to ${email}.` };
  },

  /**
   * Signs out user session from Firebase Auth and local cache.
   */
  async logout() {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return true;
  },

  /**
   * Retrieves active user from Cloud Firestore or local cache.
   */
  async getCurrentUser() {
    const raw = localStorage.getItem('user');
    let cachedUser = null;
    if (raw) {
      try {
        cachedUser = JSON.parse(raw);
      } catch {
        cachedUser = null;
      }
    }

    // Revalidate against live Firestore if connected
    if (isFirebaseConfigured && auth?.currentUser && db) {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const freshData = userDoc.data();
          const merged = {
            id: auth.currentUser.uid,
            email: auth.currentUser.email,
            full_name: freshData.full_name || auth.currentUser.displayName || cachedUser?.full_name || '',
            photo_url: freshData.photo_url || auth.currentUser.photoURL || cachedUser?.photo_url || '',
            role: freshData.role || cachedUser?.role || 'ENGINEER',
            is_active: freshData.is_active ?? true,
            auth_provider: freshData.auth_provider || cachedUser?.auth_provider || 'password'
          };
          localStorage.setItem('user', JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.warn('Firestore session revalidation notice:', e);
      }
    }

    return cachedUser;
  },

  /**
   * Fetch all registered operators/engineers from Cloud Firestore users collection.
   */
  async getAllUsers() {
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const users = [];
        snapshot.forEach(docSnap => {
          users.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (users.length > 0) return users;
      } catch (e) {
        console.warn('Firestore fetch users notice:', e);
      }
    }
    return Object.values(DEMO_USERS);
  },

  /**
   * Updates user profile info in Firestore and Firebase Auth.
   */
  async updateProfile(profileData) {
    const current = await this.getCurrentUser() || {};
    const updated = { ...current, ...profileData };
    localStorage.setItem('user', JSON.stringify(updated));

    if (isFirebaseConfigured && auth?.currentUser) {
      if (profileData.full_name || profileData.photo_url) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: profileData.full_name || auth.currentUser.displayName,
          photoURL: profileData.photo_url || auth.currentUser.photoURL
        }).catch(() => {});
      }
      if (db) {
        try {
          await setDoc(doc(db, 'users', auth.currentUser.uid), profileData, { merge: true });
        } catch (e) {
          console.warn('Firestore profile update notice:', e);
        }
      }
    }
    return updated;
  },

  /**
   * Deletes user account and removes document from Cloud Firestore.
   */
  async deleteAccount() {
    if (isFirebaseConfigured && auth?.currentUser) {
      const uid = auth.currentUser.uid;
      if (db) {
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (e) {
          console.warn('Firestore user deletion notice:', e);
        }
      }
      try {
        await deleteUser(auth.currentUser);
      } catch (e) {
        console.warn('Firebase auth user delete notice:', e);
      }
    }
    await this.logout();
    return true;
  }
};
