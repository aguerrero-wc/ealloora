// app/(private)/device.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Contexts y helpers
import LoadingSpinner from '../../components/LoadingSpinner';
import { auth } from '../../constants/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useErrorContext } from '../../contexts/ErrorContext';
import { getUserData } from '../../core/requestsHelper';

// Placeholder para imágenes de dispositivos - reemplaza con tus assets reales
const getDeviceIcon = (deviceType: string) => {
  // 🔄 TODO: Reemplaza con tu DeviceTypeManager.getDeviceIcon()
  switch (deviceType) {
    case 'termo':
      return require('../../assets/slide/volt.png'); // Agrega tu imagen
    case 'watch':
      return require('../../assets/slide/volt.png'); // Agrega tu imagen
    default:
      return require('../../assets/slide/volt.png'); // Agrega tu imagen
  }
};

// Función para obtener el tipo de dispositivo
const getDeviceType = (device: any): string => {
  return device.type?.types_name || 'generic';
};
const colors = {
  primaryButton: '#007AFF',
  primaryText: '#333333',
  secondaryText: '#666666',
  secondaryDarkText: '#757575',
  valueDarkText: '#333333',
  cardBackground: '#ffffff',
  background: '#f5f5f5',
};

// Traducciones básicas - reemplaza con tu sistema de traducciones
const translations = {
  en: {
    no_devices_title: 'No devices associated',
    no_devices_subtitle: 'Tap the + button to add your first device',
    battery_status: 'Battery',
    last_transmission: 'Last transmission',
    temperature: 'Temperature',
    humidity: 'Humidity',
    state: 'State',
    visit_website: 'Visit Website',
    logout: 'Logout',
    confirm_logout: 'Are you sure you want to logout?',
    cancel: 'Cancel',
    error_loading: 'Error loading devices',
  },
  es: {
    no_devices_title: 'No hay dispositivos asociados',
    no_devices_subtitle: 'Toca el botón + para agregar tu primer dispositivo',
    battery_status: 'Batería',
    last_transmission: 'Última transmisión',
    temperature: 'Temperatura',
    humidity: 'Humedad',
    state: 'Estado',
    visit_website: 'Visitar sitio web',
    logout: 'Cerrar sesión',
    confirm_logout: '¿Estás seguro de que quieres cerrar sesión?',
    cancel: 'Cancelar',
    error_loading: 'Error cargando dispositivos',
  },
};

const DeviceScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showError } = useErrorContext();

  // Estados
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('en');

  // Función para traducir
  const t = (key: keyof typeof translations.en): string => {
    return translations[lang][key] || translations.en[key];
  };

  // Configurar idioma
  const setupLanguage = async () => {
    try {
      const storedLang = await AsyncStorage.getItem('lang');
      if (storedLang) {
        setLang(storedLang.substring(0, 2) as 'en' | 'es');
      } else {
        const locale = Localization.getLocales()[0];
        const langCode = locale.languageCode === 'es' ? 'es' : 'en';
        setLang(langCode);
        await AsyncStorage.setItem('lang', langCode);
      }
    } catch (error) {
      console.error('Language setup error:', error);
      setLang('en');
    }
  };

  // Cargar dispositivos
  const loadDevices = async () => {
    if (!user) return;

    try {
      console.log('🔄 Cargando dispositivos...');
      const result = await getUserData(user.uid, 'devices');

      if (result.success && result.data) {
        setDevices(result.data.devices || []);
        console.log('✅ Dispositivos cargados:', result.data.devices?.length || 0);
      } else {
        console.error('❌ Error cargando dispositivos:', result.error);
        showError(result.error || t('error_loading'));
      }
    } catch (error: any) {
      console.error('❌ Error cargando dispositivos:', error);
      showError(error.message || t('error_loading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDevices();
  }, [user]);

  // Logout handler
  const handleLogout = async () => {
    Alert.alert(
      '',
      t('confirm_logout'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('✅ Usuario deslogueado');
            } catch (error) {
              console.error('❌ Error al cerrar sesión:', error);
            }
          },
        },
      ]
    );
  };

  // Navegación a dispositivo específico
  const navigateToDevice = (device: any) => {
    console.log('📱 Navegando a dispositivo:', device.serial_number);
    // Aquí puedes implementar la navegación a la pantalla de detalle del dispositivo
    Alert.alert('Info', `Dispositivo: ${device.settings?.[0]?.l_device_name || device.serial_number}`);
  };

  // Obtener estado de batería
  const getBatteryStatus = (device: any) => {
    return device.battery?.[0]?.charge_status || '-';
  };

  // Obtener estado del dispositivo
  const getDeviceState = (device: any) => {
    const type = device.type?.types_name;
    
    if (type === 'termo') {
      // Para termómetros, mostrar temperatura
      const temperature = device.last_termo_data?.[0]?.temperature;
      return temperature ? `${temperature}°C` : '-';
    } else {
      // Para otros dispositivos (watch, etc.), mostrar estado de alarma
      const lastData = device.last_watch_data?.[0];
      if (!lastData || lastData.alarm == null) {
        return '-';
      }
      
      // Estado basado en alarma
      if (lastData.alarm === 1) {
        return 'Alarma';
      } else {
        return 'Normal';
      }
    }
  };

  // Obtener estado de conexión (ok/ko) basado en mode_id
  const getConnectionState = (device: any) => {
    const modeId = device.mode?.mode_id || device.mode_id;
    
    if (modeId === 1) {
      return { status: 'ok', label: 'Conectado' };
    } else {
      return { status: 'ko', label: 'Desconectado' };
    }
  };

  // Obtener última transmisión desde updated_on
  const getLastTransmission = (device: any) => {
    const updatedOn = device.updated_on;
    if (!updatedOn) return '-';
    
    try {
      return new Date(updatedOn).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Obtener temperatura (para dispositivos termo)
  const getTemperature = (device: any) => {
    if (device.type?.types_name === 'termo') {
      const temp = device.last_termo_data?.[0]?.temperature;
      return temp ? `${temp}°C` : null;
    }
    return null;
  };

  // Obtener humedad (para dispositivos termo)
  const getHumidity = (device: any) => {
    if (device.type?.types_name === 'termo') {
      const humidity = device.last_termo_data?.[0]?.humidity;
      return humidity ? `${humidity}%` : null;
    }
    return null;
  };

  // Renderizar tarjeta de dispositivo
  const renderDeviceCard = (device: any, index: number) => {
    const deviceName = device.settings?.[0]?.l_device_name || 'Dispositivo';
    const serialNumber = device.serial_number;
    const connectionState = getConnectionState(device);
    const deviceType = getDeviceType(device);
    const humidity = getHumidity(device);
    const temperature = getTemperature(device);

    return (
      <TouchableOpacity
        key={`${device.sigfox_id || device.serial_number}-${index}`}
        style={[
          styles.deviceCard,
          { borderLeftWidth: 4, borderLeftColor: connectionState.status === 'ok' ? '#4CAF50' : '#FF3B30' }
        ]}
        onPress={() => navigateToDevice(device)}
        activeOpacity={0.8}
      >
        {/* Badge de estado prominente */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: connectionState.status === 'ok' ? '#4CAF50' : '#FF3B30' }
        ]}>
          <Text style={styles.statusBadgeText}>
            {connectionState.status === 'ok' ? '● CONECTADO' : '● DESCONECTADO'}
          </Text>
        </View>

        <View style={styles.deviceHeader}>
          <View style={styles.deviceIconContainer}>
            <Image
              style={styles.deviceIconImage}
              source={getDeviceIcon(deviceType)}
              defaultSource={require('../../assets/logoactionbar.png')} // Fallback
            />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{deviceName}</Text>
            <Text style={styles.deviceSerial}>{serialNumber}</Text>
            <Text style={styles.deviceType}>
              {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.deviceDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.deviceProperty}>
              {t('battery_status')}: <Text style={styles.deviceValue}>{getBatteryStatus(device)}</Text>
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.deviceProperty}>
              {t('last_transmission')}: <Text style={styles.deviceValue}>{getLastTransmission(device)}</Text>
            </Text>
          </View>
          
          {/* Mostrar temperatura y humedad para termómetros */}
          {temperature && (
            <View style={styles.detailRow}>
              <Text style={styles.deviceProperty}>
                {t('temperature')}: <Text style={[styles.deviceValue, styles.temperatureValue]}>{temperature}</Text>
              </Text>
            </View>
          )}
          {humidity && (
            <View style={styles.detailRow}>
              <Text style={styles.deviceProperty}>
                {t('humidity')}: <Text style={styles.deviceValue}>{humidity}</Text>
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar vista sin dispositivos
  const renderNoDevices = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="devices" size={64} color={colors.secondaryText} />
      <Text style={styles.emptyTitle}>{t('no_devices_title')}</Text>
      <Text style={styles.emptySubtitle}>{t('no_devices_subtitle')}</Text>
    </View>
  );

  // Effects
  useEffect(() => {
    setupLanguage();
  }, []);

  useEffect(() => {
    if (user) {
      loadDevices();
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Cargando dispositivos..." />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Dispositivos</Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color={colors.primaryButton} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {devices.length > 0 ? (
          devices.map((device, index) => renderDeviceCard(device, index))
        ) : (
          !loading && renderNoDevices()
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(private)/add-device')}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryText,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  deviceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  deviceIconContainer: {
    marginRight: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  deviceIconImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  deviceSerial: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 11,
    color: colors.primaryButton,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    marginBottom: 6,
  },
  deviceProperty: {
    fontSize: 14,
    color: colors.secondaryDarkText,
  },
  deviceValue: {
    color: colors.valueDarkText,
    fontWeight: '500',
  },
  temperatureValue: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondaryText,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryButton,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default DeviceScreen;