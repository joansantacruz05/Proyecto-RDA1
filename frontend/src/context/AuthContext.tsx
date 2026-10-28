import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  nombre: string;
  correo: string;
  rol: 'Admin' | 'Cliente' | 'Anfitrión' | string;
  telefono?: string;
  edad?: number;
  direccion?: string;
  pais?: string;
  scopes?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isHost: boolean;
  login: (correo: string, contrasena: string) => Promise<void>;
  register: (nombre: string, correo: string, contrasena: string, rol?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
    } catch (err) {
      console.warn('Sesión caducada o inválida:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (correo: string, contrasena: string) => {
    const data = await api.post<{ access_token: string; usuario: UserProfile }>('/auth/login', {
      correo,
      contrasena,
    });

    const jwtToken = data.access_token;
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(data.usuario);
  };

  const register = async (nombre: string, correo: string, contrasena: string, rol?: string) => {
    await api.post('/auth/register', {
      nombre,
      correo,
      contrasena,
      rol,
    });
    // Iniciar sesión automáticamente tras registro exitoso
    await login(correo, contrasena);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const updated = await api.patch<UserProfile>('/auth/me', data);
    setUser(updated);
  };

  const roleLower = (user?.rol || '').toLowerCase();
  const isAdmin = roleLower.includes('admin');
  const isHost = roleLower.includes('anfitr') || roleLower.includes('host');
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        isHost,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
