// contexts/NotificationsContext.tsx
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { makeAuthenticatedRequest } from '../core/requestsHelper';
import { useAuth } from './AuthContext';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // Deprecated pero necesario para compatibilidad
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Nuevo: mostrar banner en pantalla
    shouldShowList: true,   // Nuevo: mostrar en lista de notificaciones
  }),
});

interface NotificationsContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPushNotifications: () => Promise<void>;
  refreshDevices: () => void;
  setRefreshCallback: (callback: () => void) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const refreshCallbackRef = useRef<(() => void) | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Función para registrar el callback de refresh
  const setRefreshCallback = (callback: () => void) => {
    refreshCallbackRef.current = callback;
  };

  // Función para triggear refresh de dispositivos
  const refreshDevices = () => {
    console.log('🔄 Triggerando refresh de dispositivos...');
    if (refreshCallbackRef.current) {
      refreshCallbackRef.current();
    }
  };

  // Registrar para push notifications
  const registerForPushNotifications = async () => {
    if (!user) return;

    let token: string | undefined;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Error', 'Se necesitan permisos de notificaciones para el funcionamiento completo de la app.');
        return;
      }
      
      try {
        // Ahora que tienes projectId configurado por EAS, esto debería funcionar
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        
        if (!projectId) {
          console.log('⚠️ No projectId found, usando token básico...');
          token = (await Notifications.getExpoPushTokenAsync()).data;
        } else {
          console.log('✅ Using projectId:', projectId);
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
        
        console.log('📱 Expo push token:', token);
        setExpoPushToken(token);
        
        // Enviar token al servidor
        await sendTokenToServer(token);
        
      } catch (error) {
        console.error('Error obteniendo push token:', error);
        // Fallback: continuar sin token
      }
    } else {
      Alert.alert('Error', 'Las notificaciones push no funcionan en simulador.');
    }
  };

  // Enviar token al servidor (igual que en tu código original)
  const sendTokenToServer = async (token: string) => {
    if (!user) return;

    try {
      console.log('📤 Enviando token al servidor...');
      
      const response = await makeAuthenticatedRequest(`user/${user.uid}?action=token`, {
        method: 'PUT',
        body: JSON.stringify({
          phone_token: token,
        }),
      });

      console.log('✅ Token enviado al servidor exitosamente');
    } catch (error) {
      console.error('❌ Error enviando token al servidor:', error);
    }
  };

  // Manejar notificación recibida
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('🔔 Notificación recibida:', notification);
    setNotification(notification);
    
    // Si la app está en foreground, triggear refresh automático
    refreshDevices();
  };

  // Manejar notificación tocada
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('👆 Notificación tocada:', response);
    
    const notificationData = response.notification.request.content.data;
    
    // Manejar datos específicos de la notificación (como en tu código original)
    if (notificationData?.serial_number) {
      console.log('📱 Device específico:', notificationData.serial_number);
      // Aquí puedes navegar a un dispositivo específico
    }
    
    // Sempre triggear refresh
    refreshDevices();
  };

  // Setup de listeners y polling
  useEffect(() => {
    if (!user) return;

    // Registrar para notificaciones
    registerForPushNotifications();

    // Listener para notificaciones recibidas
    notificationListener.current = Notifications.addNotificationReceivedListener(handleNotificationReceived);

    // Listener para notificaciones tocadas
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Polling cada 5 minutos (como en tu código original)
    intervalRef.current = setInterval(() => {
      console.log('⏰ Polling automático - refreshing devices...');
      refreshDevices();
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      // Cleanup
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

  const value: NotificationsContextType = {
    expoPushToken,
    notification,
    registerForPushNotifications,
    refreshDevices,
    setRefreshCallback,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};