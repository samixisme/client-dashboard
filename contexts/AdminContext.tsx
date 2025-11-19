
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  userRole: 'admin' | 'client'; // For simplicity
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const userRole = 'admin'; // Hardcoded as per the request's context

  const toggleAdminMode = () => {
    setIsAdminMode(prev => !prev);
  };

  return (
    <AdminContext.Provider value={{ isAdminMode, toggleAdminMode, userRole }}>
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
