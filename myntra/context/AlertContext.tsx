import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message: string;
  buttons?: AlertButton[];
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface AlertContextProps {
  alertOptions: AlertOptions | null;
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertOptions(null);
  }, []);

  return (
    <AlertContext.Provider value={{ alertOptions, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
