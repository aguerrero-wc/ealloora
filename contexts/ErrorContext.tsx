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
        Alert.alert('Error', error.message || 'Error de autenticación');
      },
      handleApiError: (error: any, customMessage?: string) => {
        Alert.alert('Error', customMessage || 'Error de API');
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
      // Auth errors
      'auth/user-not-found': 'No existe una cuenta con este email',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/invalid-credential': 'Credenciales inválidas',
      'auth/email-already-in-use': 'Este email ya está registrado',
      'auth/weak-password': 'La contraseña es muy débil',
      'auth/requires-recent-login': 'Necesitas iniciar sesión nuevamente',
      
      // Custom server errors
      'server/user-not-found': 'Usuario no encontrado en el servidor',
      'server/invalid-token': 'Token de sesión inválido',
      'server/maintenance': 'Servidor en mantenimiento. Intenta más tarde',
    };

    return errorMessages[errorCode] || 'Ocurrió un error inesperado. Intenta nuevamente';
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
      errorMessage = 'Error de autenticación. Intenta nuevamente';
    }

    // Si hay un callback de retry y es un error de red, ofrecer reintentar
    if (retryCallback && (error.code === 'auth/network-request-failed' || error.status === 500)) {
      Alert.alert(
        'Error de Conexión',
        errorMessage + '\n\n¿Quieres intentar nuevamente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: retryCallback }
        ]
      );
    } else {
      showError(errorMessage);
    }
  };

  // Manejo general de errores de API
  const handleApiError = (error: any, customMessage?: string) => {
    console.log('🌐 API Error:', error);

    let errorMessage = customMessage || 'Error de conexión con el servidor';

    if (error.response) {
      // Error de respuesta del servidor
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          errorMessage = data?.message || 'Solicitud inválida';
          break;
        case 401:
          errorMessage = 'No autorizado. Inicia sesión nuevamente';
          break;
        case 403:
          errorMessage = 'No tienes permisos para esta acción';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intenta más tarde';
          break;
        case 503:
          errorMessage = 'Servicio no disponible. Intenta más tarde';
          break;
        default:
          errorMessage = `Error del servidor (${status})`;
      }
    } else if (error.request) {
      // Error de red
      errorMessage = 'Error de conexión. Verifica tu internet';
    } else {
      // Error en la configuración de la request
      errorMessage = error.message || 'Error inesperado';
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