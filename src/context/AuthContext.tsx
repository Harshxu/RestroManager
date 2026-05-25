'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserType = {
  _id: string;
  email: string;
  name: string;
  businessName: string;
  businessType: 'Restaurant' | 'Kirana' | 'Medical';
  dealerId?: any;
};

type AuthContextType = {
  user: UserType | null;
  loading: boolean;
  login: (userData: UserType) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem('omnibiz_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Verify if user still exists in newly seeded database
        fetch(`/api/auth/users`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error();
          })
          .then((users) => {
            const exists = users.some((u: any) => u._id === parsedUser._id);
            if (exists) {
              setUser(parsedUser);
            } else {
              // Stale session from old seed, force logout
              localStorage.removeItem('omnibiz_user');
              setUser(null);
              router.push('/login');
            }
            setLoading(false);
          })
          .catch(() => {
            // Fallback to offline/cached user if API is loading/failing
            setUser(parsedUser);
            setLoading(false);
          });
      } catch (e) {
        localStorage.removeItem('omnibiz_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Route guard
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = (userData: UserType) => {
    localStorage.setItem('omnibiz_user', JSON.stringify(userData));
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('omnibiz_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
