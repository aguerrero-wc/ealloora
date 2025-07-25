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
import { useNotifications } from '../../contexts/NotificationsContext';
import { getUserData } from '../../core/requestsHelper';

// Language imports
import en from '../../lang/en';
import es from '../../lang/es';
import fi from '../../lang/fi';
import fr from '../../lang/fr';
import it from '../../lang/it';
import sv from '../../lang/sv';

// Types
import { Languages, TranslationKeys, translate } from '../../types/translations';

// Configuración de traducciones
const translations: Languages = {
  en,
  it,
  es,
  fr,
  sv,
  fi,
};

// Función de traducción
const t = (key: TranslationKeys, locale: string): string => {
  return translate(key, locale as keyof Languages, translations);
};

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
  success: '#4CAF50',
  error: '#FF3B30', 
  warning: '#FF9500',
  info: '#007AFF',
  alertBackground: 'rgba(255, 59, 48, 0.05)',
  warningBackground: 'rgba(255, 149, 0, 0.1)',
};

const DeviceScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showError } = useErrorContext();
  const { setRefreshCallback, refreshDevices } = useNotifications();

  // Estados
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<keyof Languages>('en');

  // Configurar idioma
  const setupLanguage = async () => {
    try {
      const storedLang = await AsyncStorage.getItem('lang');
      if (storedLang) {
        const langCode = storedLang.substring(0, 2) as keyof Languages;
        // Verificar que el idioma sea soportado
        if (translations[langCode]) {
          setLang(langCode);
        } else {
          setLang('en');
        }
      } else {
        const locale = Localization.getLocales()[0];
        const langCode = locale.languageCode?.substring(0, 2) as keyof Languages;
        if (translations[langCode]) {
          setLang(langCode);
        } else {
          setLang('en');
        }
        await AsyncStorage.setItem('lang', langCode || 'en');
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
      const result = await getUserData(user.uid, 'last');

      if (result.success && result.data) {
        setDevices(result.data.devices || []);
        console.log('✅ Dispositivos cargados:', result.data.devices?.length || 0);
      } else {
        console.error('❌ Error cargando dispositivos:', result.error);
        showError(result.error || 'Error loading devices');
      }
    } catch (error: any) {
      console.error('❌ Error cargando dispositivos:', error);
      showError(error.message || 'Error loading devices');
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
      t('confirm_logout', lang),
      [
        { text: t('cancel', lang), style: 'cancel' },
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

const navigateToDevice = (device: any) => {
  console.log('📱 Navegando a dispositivooooooo:', device.type);
  
  // Navegar a la página de historial del dispositivo
  router.push({
    pathname: '/(private)/device-history',
    params: {
      deviceID: device.UserDevice?.serial_number || device.serial_number,
      deviceName: device.settings?.[0]?.l_device_name || device.serial_number,
      sigfox_id: device.sigfox_id,
      deviceType: device.type?.types_name || 'generic',
      deviceSection: 'Single', // Para indicar que es un dispositivo específico
    },
  });
};

  // Obtener estado de batería
  const getBatteryStatus = (device: any) => {
    return device.battery?.[0]?.charge_status || '-';
  };

  // Obtener estado de conexión mejorado con la nueva estructura de datos
  const getConnectionState = (device: any) => {
    console.log('Device status check:', device);
    
    // Prioridad 1: Verificar si el dispositivo tiene mode_id = 1 (ON)
    const modeId = device.mode?.mode_id || device.mode_id;
    
    // Si el modo está OFF, automáticamente es desconectado
    if (modeId !== 1) {
      return { status: 'ko', label: 'Desconectado' };
    }
    
    // Prioridad 2: Verificar el estado más reciente del dispositivo
    // Usar last_watch_family_data para dispositivos tipo watch/leak/volt
    const lastWatchFamilyData = device.last_watch_family_data?.[0];
    if (lastWatchFamilyData) {
      const state = lastWatchFamilyData.state;
      
      // Verificar si hay alarma activa
      if (state?.is_alarm === true) {
        return { status: 'alarm', label: 'Alarma Activa' };
      }
      
      // Estados que indican dispositivo activo/conectado
      const activeStates = ['OK', 'ARMED', 'MONITORING'];
      if (activeStates.includes(state?.state_name)) {
        return { status: 'ok', label: 'Conectado' };
      }
      
      // Estados que indican dispositivo inactivo
      const inactiveStates = ['DISARMED', 'OFF', 'DISCONNECTED'];
      if (inactiveStates.includes(state?.state_name)) {
        return { status: 'ko', label: 'Desconectado' };
      }
    }
    
    // Prioridad 3: Para dispositivos termo, verificar last_termo_data
    if (device.type?.types_name === 'termo') {
      const lastTermoData = device.last_termo_data?.[0];
      if (lastTermoData && lastTermoData.temperature != null) {
        return { status: 'ok', label: 'Conectado' };
      }
    }
    
    // Prioridad 4: Verificar última transmisión (timestamp reciente)
    const updatedOn = device.updated_on;
    if (updatedOn) {
      const lastUpdate = new Date(updatedOn);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      // Si la última actualización fue hace menos de 24 horas
      if (hoursDiff < 24) {
        return { status: 'ok', label: 'Conectado' };
      }
    }
    
    // Por defecto, si el modo está ON pero no hay datos recientes
    return { status: 'warning', label: 'Sin datos recientes' };
  };

  // Obtener estado del dispositivo mejorado
  const getDeviceState = (device: any) => {
    const type = device.type?.types_name;
    console.log('typeeeeeeeeeee',type);
    
    if (type === 'termo') {
      // Para termómetros, mostrar temperatura
      const temperature = device.last_termo_data?.[0]?.temperature;
      return temperature ? `${temperature}°C` : '-';
    } else {
      // Para otros dispositivos, usar last_watch_family_data
      const lastWatchFamilyData = device.last_watch_family_data?.[0];
      
      if (lastWatchFamilyData && lastWatchFamilyData.state) {
        const state = lastWatchFamilyData.state;
        
        // Si hay alarma, mostrar estado de alarma
        if (state.is_alarm === true) {
          return 'ALARMA';
        }
        
        // Mostrar el estado localizado según el idioma
        // Por ahora usar español, pero puedes cambiarlo según el idioma seleccionado
        switch (state.state_name) {
          case 'OK':
            return 'OK';
          case 'DISARMED':
            return 'Desarmado';
          case 'ARMED':
            return 'Armado';
          case 'MONITORING':
            return 'Monitoreando';
          default:
            return state.state_name || 'Desconocido';
        }
      }
      
      // Fallback al método anterior si no hay datos nuevos
      const lastData = device.last_watch_data?.[0];
      if (lastData && lastData.alarm != null) {
        return lastData.alarm === 1 ? 'Alarma' : 'Normal';
      }
      
      return '-';
    }
  };

  // Función auxiliar para obtener el color del badge según el estado
  const getStatusBadgeColor = (connectionState: any) => {
    switch (connectionState.status) {
      case 'ok':
        return colors.success; // Verde
      case 'alarm':
        return colors.error; // Rojo alarma
      case 'warning':
        return colors.warning; // Naranja
      case 'ko':
      default:
        return colors.error; // Rojo desconectado
    }
  };

  // Función auxiliar para obtener el texto del badge
  const getStatusBadgeText = (connectionState: any) => {
    switch (connectionState.status) {
      case 'ok':
        return '● CONECTADO';
      case 'alarm':
        return '● ALARMA';
      case 'warning':
        return '● ADVERTENCIA';
      case 'ko':
      default:
        return '● DESCONECTADO';
    }
  };

  // Función para verificar si un dispositivo necesita atención
  const needsAttention = (device: any) => {
    const connectionState = getConnectionState(device);
    return connectionState.status === 'alarm' || connectionState.status === 'ko';
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

  // Renderizar tarjeta de dispositivo actualizada
  const renderDeviceCard = (device: any, index: number) => {
    const deviceName = device.settings?.[0]?.l_device_name || 'Dispositivo';
    const serialNumber = device.serial_number;
    const connectionState = getConnectionState(device);
    const deviceType = getDeviceType(device);
    const humidity = getHumidity(device);
    const temperature = getTemperature(device);
    const deviceState = getDeviceState(device);
    const badgeColor = getStatusBadgeColor(connectionState);
    const badgeText = getStatusBadgeText(connectionState);

    return (
      <TouchableOpacity
        key={`${device.sigfox_id || device.serial_number}-${index}`}
        style={[
          styles.deviceCard,
          { 
            borderLeftWidth: 4, 
            borderLeftColor: badgeColor,
            // Añadir un ligero fondo de alerta si necesita atención
            backgroundColor: needsAttention(device) 
              ? colors.alertBackground
              : colors.cardBackground
          }
        ]}
        onPress={() => navigateToDevice(device)}
        activeOpacity={0.8}
      >
        {/* Badge de estado prominente */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: badgeColor }
        ]}>
          <Text style={styles.statusBadgeText}>
            {badgeText}
          </Text>
        </View>

        <View style={styles.deviceHeader}>
          <View style={styles.deviceIconContainer}>
            <Image
              style={styles.deviceIconImage}
              source={getDeviceIcon(deviceType)}
              defaultSource={require('../../assets/logoactionbar.png')}
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
          {/* Estado del dispositivo */}
          {/* <View style={styles.detailRow}>
            <Text style={styles.deviceProperty}>
              Estado: <Text style={[
                styles.deviceValue,
                {
                  color: connectionState.status === 'alarm' ? colors.error :
                         connectionState.status === 'ok' ? colors.success :
                         connectionState.status === 'warning' ? colors.warning : colors.secondaryText
                }
              ]}>{deviceState}</Text>
            </Text>
          </View> */}

          {/* Batería */}
          <View style={styles.detailRow}>
            <Text style={styles.deviceProperty}>
              {t('battery_status', lang)}: <Text style={styles.deviceValue}>{getBatteryStatus(device)}%</Text>
            </Text>
          </View>

          {/* Última transmisión */}
          <View style={styles.detailRow}>
            <Text style={styles.deviceProperty}>
              {t('last_trasmission', lang)}: <Text style={styles.deviceValue}>{getLastTransmission(device)}</Text>
            </Text>
          </View>
          
          {/* Mostrar temperatura y humedad para termómetros */}
          {temperature && (
            <View style={styles.detailRow}>
              <Text style={styles.deviceProperty}>
                {t('temperature', lang)}: <Text style={[styles.deviceValue, styles.temperatureValue]}>{temperature}</Text>
              </Text>
            </View>
          )}
          {humidity && (
            <View style={styles.detailRow}>
              <Text style={styles.deviceProperty}>
                {t('humidity', lang)}: <Text style={styles.deviceValue}>{humidity}</Text>
              </Text>
            </View>
          )}

          {/* Información adicional del estado si es relevante */}
          {connectionState.status === 'warning' && (
            <View style={styles.warningRow}>
              <MaterialIcons name="warning" size={16} color={colors.warning} />
              <Text style={[styles.deviceProperty, { color: colors.warning, marginLeft: 4 }]}>
                Sin datos recientes
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
      <Text style={styles.emptyTitle}>There are no associated devices</Text>
      <Text style={styles.emptySubtitle}>Tap the + button to add your first device</Text>
    </View>
  );

  // Effects
  useEffect(() => {
    setupLanguage();
  }, []);

  useEffect(() => {
    if (user) {
      loadDevices();
      
      // Registrar callback para auto-refresh desde notificaciones
      setRefreshCallback(() => {
        console.log('🔄 Auto-refresh triggered by notification/polling');
        loadDevices();
      });
    }
  }, [user, setRefreshCallback]);

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Cargando dispositivos..." />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('my_devices', lang)}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={24} color={colors.primaryButton} />
          </Pressable>
        </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#FF6B35',
    padding: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBackground,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
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