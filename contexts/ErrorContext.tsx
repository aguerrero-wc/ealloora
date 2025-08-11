// contexts/ErrorContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

// Tipos para los errores
interface FirebaseError {
  code?: string;
  message?: string;
  status?: number;
}

interface ErrorContextType {
  // Estado global de errores
  currentError: string | null;
  isErrorVisible: boolean;
  
  // Funciones para manejar errores
  showError: (message: string) => void;
  hideError: () => void;
  handleFirebaseAuthError: (error: FirebaseError, retryCallback?: () => void) => void;
  handleApiError: (error: any, customMessage?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    // En lugar de lanzar error, devolver valores por defecto
    console.warn('useErrorContext used outside ErrorProvider, using defaults');
    return {
      currentError: null,
      isErrorVisible: false,
      showError: (message: string) => Alert.alert('Error', message),
      hideError: () => {},
      handleFirebaseAuthError: (error: FirebaseError, retryCallback?: () => void) => {
        Alert.alert('Error', error.message || 'Authentication error');
      },
      handleApiError: (error: any, customMessage?: string) => {
        Alert.alert('Error', customMessage || 'API Error');
      },
    };
  }
  return context;
};

interface ErrorProviderProps {
  children: React.ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);

  // Función para mostrar errores globales
  const showError = (message: string) => {
    setCurrentError(message);
    setIsErrorVisible(true);
    
    // También mostrar como Alert nativo
    Alert.alert('Error', message, [
      { text: 'OK', onPress: hideError }
    ]);
  };

  // Función para ocultar errores
  const hideError = () => {
    setCurrentError(null);
    setIsErrorVisible(false);
  };

  // Mapeo de códigos de error de Firebase a mensajes en español
  const getFirebaseErrorMessage = (errorCode: string): string => {
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'No account exists with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-email': 'Invalid email',
      'auth/user-disabled': 'This account has been disabled',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Connection error. Check your internet',
      'auth/invalid-credential': 'Invalid credentials',
      'auth/email-already-in-use': 'This email is already registered',
      'auth/weak-password': 'The password is too weak',
      'auth/requires-recent-login': 'You need to log in again',

      // Custom server errors
      'server/user-not-found': 'User not found on the server',
      'server/invalid-token': 'Invalid session token',
      'server/maintenance': 'Server under maintenance. Please try again later',
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  };

  // Manejo específico de errores de Firebase Auth
  const handleFirebaseAuthError = (error: FirebaseError, retryCallback?: () => void) => {
    console.log('🔥 Firebase Auth Error:', {
      code: error.code,
      message: error.message,
      status: error.status
    });

    let errorMessage = '';
    
    if (error.code) {
      errorMessage = getFirebaseErrorMessage(error.code);
    } else if (error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = 'Authentication error. Please try again.';
    }

    // Si hay un callback de retry y es un error de red, ofrecer reintentar
    if (retryCallback && (error.code === 'auth/network-request-failed' || error.status === 500)) {
      Alert.alert(
        'Connection Error',
        errorMessage + '\n\nWould you like to try again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: retryCallback }
        ]
      );
    } else {
      showError(errorMessage);
    }
  };

  // Manejo general de errores de API
  const handleApiError = (error: any, customMessage?: string) => {
    console.log('🌐 API Error:', error);

    let errorMessage = customMessage || 'Error connecting to the server';

    if (error.response) {
      // Error de respuesta del servidor
      const status = error.response.status;
      const data = error.response.data;

    switch (status) {
      case 400:
        errorMessage = data?.message || 'Invalid request';
        break;
      case 401:
        errorMessage = 'Unauthorized. Please log in again';
        break;
      case 403:
        errorMessage = 'You do not have permission for this action';
        break;
      case 404:
        errorMessage = 'Resource not found';
        break;
      case 500:
        errorMessage = 'Internal server error. Please try again later';
        break;
      case 503:
        errorMessage = 'Service unavailable. Please try again later';
        break;
      default:
        errorMessage = `Server error (${status})`;
    }
    } else if (error.request) {
      // Error de red
      errorMessage = 'Connection Error';
    } else {
      // Error en la configuración de la request
      errorMessage = error.message || 'unexpected error';
    }

    showError(errorMessage);
  };

  const value: ErrorContextType = {
    currentError,
    isErrorVisible,
    showError,
    hideError,
    handleFirebaseAuthError,
    handleApiError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};