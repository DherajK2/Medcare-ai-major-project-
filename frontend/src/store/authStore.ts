import { create } from 'zustand'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth'
import { auth, googleProvider } from '../api/firebase'
import { usePatientStore } from './patientStore'

export interface AppUser {
  id: string
  uid: string
  email: string | null
  displayName?: string | null
  photoURL?: string | null
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  signInWithOtp: (email: string) => Promise<void>
  demoSignIn: () => Promise<void>
  signOut: () => Promise<void>
}

function mapFirebaseUser(u: FirebaseUser | null): AppUser | null {
  if (!u) return null;
  return {
    id: u.uid,
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || u.email?.split('@')[0] || 'User',
    photoURL: u.photoURL,
    user_metadata: {
      full_name: u.displayName || u.email?.split('@')[0] || 'User',
      avatar_url: u.photoURL || undefined
    }
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialize: async () => {
    try {
      // Check if returning from a Google redirect
      try {
        const redirectRes = await getRedirectResult(auth);
        if (redirectRes?.user) {
          const appUser = mapFirebaseUser(redirectRes.user);
          set({ user: appUser, loading: false });
          usePatientStore.getState().reset();
          await usePatientStore.getState().fetchPatients();
        }
      } catch {}

      // Set up real-time Firebase Auth listener
      onAuthStateChanged(auth, async (fbUser) => {
        const appUser = mapFirebaseUser(fbUser);
        const prevUser = get().user;
        set({ user: appUser, loading: false });

        if (appUser?.id !== prevUser?.id) {
          usePatientStore.getState().reset();
          if (appUser) {
            await usePatientStore.getState().fetchPatients();
          }
        }
      });
    } catch {
      set({ loading: false });
    }
  },
  signIn: async (email, password) => {
    usePatientStore.getState().reset();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const mapped = mapFirebaseUser(cred.user);
    set({ user: mapped });
    await usePatientStore.getState().fetchPatients();
  },
  signUp: async (email, password, fullName) => {
    usePatientStore.getState().reset();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName) {
      try {
        await updateProfile(cred.user, { displayName: fullName });
      } catch {}
    }
    const mapped = mapFirebaseUser(cred.user);
    if (mapped?.user_metadata) {
      mapped.user_metadata.full_name = fullName;
    }
    set({ user: mapped });
    await usePatientStore.getState().fetchPatients();
  },
  signInWithGoogle: async () => {
    usePatientStore.getState().reset();
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const mapped = mapFirebaseUser(cred.user);
      set({ user: mapped });
      await usePatientStore.getState().fetchPatients();
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    }
  },
  resetPasswordForEmail: async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  },
  updatePassword: async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('No user is currently signed in.');
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  },
  signInWithOtp: async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  },
  demoSignIn: async () => {
    usePatientStore.getState().reset();
    const demoUser: AppUser = {
      id: 'demo-user-caregiver-001',
      uid: 'demo-user-caregiver-001',
      email: 'demo@medcare.ai',
      displayName: 'Demo Caregiver',
      user_metadata: { full_name: 'Demo Caregiver' }
    };
    set({ user: demoUser, loading: false });
    await usePatientStore.getState().fetchPatients();
  },
  signOut: async () => {
    try {
      const storedToken = localStorage.getItem('medcare_push_token');
      if (storedToken) {
        try {
          const { monitoringApi } = await import('../api/monitoring');
          await monitoringApi.deregisterToken(storedToken);
        } catch {}
        localStorage.removeItem('medcare_push_token');
        localStorage.removeItem('medcare_push_permission');
        localStorage.removeItem('medcare_last_alert_ts');
      }
      usePatientStore.getState().reset();
      await firebaseSignOut(auth);
    } catch {}
    set({ user: null });
  },
}));