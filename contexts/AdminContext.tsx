import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import { toast } from 'sonner';

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  userRole: 'admin' | 'client';
  isAdmin: boolean;
  isLoadingAdminCheck: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('isAdminMode') === 'true';
  });

  const userRole = user?.role || 'client';
  const isAdmin = userRole === 'admin';
  const isLoadingAdminCheck = loading;

  const toggleAdminMode = useCallback(() => {
    setIsAdminMode(prev => {
      const newValue = !prev;
      localStorage.setItem('isAdminMode', String(newValue));
      return newValue;
    });
  }, []);

  useEffect(() => {
    try {
      if (!isLoadingAdminCheck && !isAdmin && user !== null) {
        if (location.pathname.startsWith('/admin')) {
          toast.error("You don't have permission to access the admin area.");
          navigate('/');
        }
      }
    } catch {
      toast.error('Failed to verify admin permissions.');
    }
  }, [isLoadingAdminCheck, isAdmin, user, navigate, location.pathname]);

  return (
    <AdminContext.Provider 
      value={useMemo(() => ({ 
        isAdminMode, 
        toggleAdminMode, 
        userRole,
        isAdmin,
        isLoadingAdminCheck
      }), [isAdminMode, toggleAdminMode, userRole, isAdmin, isLoadingAdminCheck])}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
