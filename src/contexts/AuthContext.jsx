import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseReady } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchUserRole(uid) {
    if (!firebaseReady || !db) return null;
    try {
      const adminDoc = await getDoc(doc(db, 'admins', uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        setUserRole(data.role || 'admin');
        setIsAdmin(true);
        return data.role || 'admin';
      }
      setUserRole(null);
      setIsAdmin(false);
      return null;
    } catch (error) {
      console.error('Error fetching admin role:', error);
      setUserRole(null);
      setIsAdmin(false);
      return null;
    }
  }

  async function login(email, password) {
    if (!firebaseReady) {
      throw new Error('Firebase is not configured. Please set up your .env file.');
    }
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserRole(credential.user.uid);
    return credential;
  }

  async function logout() {
    setUserRole(null);
    setIsAdmin(false);
    if (!firebaseReady) return;
    return signOut(auth);
  }

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserRole(user.uid);
      } else {
        setUserRole(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    isAdmin,
    loading,
    login,
    logout,
    firebaseReady,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}