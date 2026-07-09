import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (u?: User | null) => {
    const currentUser = u !== undefined ? u : user;
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        if (data.theme_mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        // Create initial profile for new users
        const initialProfile: UserProfile = {
          nickname: '美食家',
          banner_title: '老吃家商户榜',
          dish_banner_title: '老吃家餐品榜',
          theme_mode: 'light',
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        await setDoc(docRef, initialProfile);
        setProfile(initialProfile);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      // Fallback profile if Firestore fails
      setProfile({
        nickname: '美食家',
        banner_title: '老吃家商户榜',
        dish_banner_title: '老吃家餐品榜',
        theme_mode: 'light',
        created_at: Date.now(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await refreshProfile(u);
      } else {
        setProfile(null);
        document.documentElement.classList.remove('dark');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: () => refreshProfile() }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
