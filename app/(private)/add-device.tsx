// app/(private)/add-device.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermissions } from 'expo-camera';
import * as Localization from 'expo-localization';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';

// Constants
import api from '../../constants/api';

// Contexts
import { useAuth } from '../../contexts/AuthContext';
import { useErrorContext } from '../../contexts/ErrorContext';

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

const colors = {
  primaryButton: '#007AFF',
  primaryText: '#333333',
  secondaryText: '#666666',
  secondaryDarkText: '#757575',
  valueDarkText: '#333333',
  cardBackground: '#ffffff',
  background: '#f5f5f5',
  error: '#FF3B30',
  inputBackground: '#f5f5f5',
  inputBorder: '#e0e0e0',
  tabActive: '#007AFF',
  tabInactive: '#999999',
};

const AddDeviceScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { showError } = useErrorContext();

  // Type-safe access to params
  const first = params.first as string | undefined;
  const list = params.list as string | undefined;
  const map = params.map as string | undefined;

  // Hook para permisos de cámara
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Estados principales
  const [activeTab, setActiveTab] = useState<TabType>('serial');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<keyof Languages>('en');
  const [loaded, setLoaded] = useState(false);

  // Estados del formulario
  const [serial, setSerial] = useState('');
  const [name, setName] = useState('');

  // Referencias
  const nameRef = useRef<TextInput>(null);

  // Estados para las tabs
  const [routes, setRoutes] = useState<TabRoute[]>([
    { key: 'serial', title: 'SERIAL' },
    { key: 'qr', title: 'QR' },
  ]);

// Types para tabs
type TabType = 'serial' | 'qr';

interface TabRoute {
  key: TabType;
  title: string;
}

  // Configurar idioma y títulos de tabs
  const setupLanguageAndTabs = async () => {
    try {
      const storedLang = await AsyncStorage.getItem('lang');
      if (storedLang) {
        const langCode = storedLang.substring(0, 2) as keyof Languages;
        if (translations[langCode]) {
          setLang(langCode);
          
          // Actualizar títulos de tabs con traducciones
          setRoutes([
            { key: 'serial', title: t('serial', langCode).toUpperCase() },
            { key: 'qr', title: t('qr', langCode).toUpperCase() },
          ]);
        } else {
          setLang('en');
        }
      } else {
        const locale = Localization.getLocales()[0];
        const langCode = locale.languageCode?.substring(0, 2) as keyof Languages;
        if (translations[langCode]) {
          setLang(langCode);
          setRoutes([
            { key: 'serial', title: t('serial', langCode).toUpperCase() },
            { key: 'qr', title: t('qr', langCode).toUpperCase() },
          ]);
        } else {
          setLang('en');
        }
        await AsyncStorage.setItem('lang', langCode || 'en');
      }
      
      setLoaded(true);
    } catch (error) {
      console.error('Error setting up language:', error);
      setLang('en');
      setLoaded(true);
    }
  };

  // Función para agregar dispositivo (formulario manual)
  const handleAddDevice = async () => {
    // Validaciones
    if (!serial.trim()) {
      showError(t('serial', lang) + ' es requerido');
      return;
    }

    if (!name.trim()) {
      showError(t('dev_name', lang) + ' es requerido');
      return;
    }

    if (!user) {
      showError('Usuario no autenticado');
      return;
    }

    setLoading(true);

    try {
      // Obtener token del usuario
      const accessToken = await user.getIdToken(true);

      // Llamada a la API
      const response = await fetch(
        `${api.endpoint}device/${serial.toUpperCase()}?action=associate`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: name.trim(),
          }),
        }
      );

      const responseJson = await response.json();

      if (responseJson.status_code === 400) {
        console.log('Error 400:', responseJson);
        Alert.alert(
          'Error',
          'Código serial no válido. Verifica el código del dispositivo',
          [{ text: 'OK' }],
          { cancelable: false }
        );
        setLoading(false);
        return;
      }

      if (responseJson.status_code >= 400) {
        throw new Error(responseJson.message || 'Error del servidor');
      }

      // Éxito
      console.log('✅ Device associated successfully:', responseJson);
      await handleSuccessNavigation();

    } catch (error: any) {
      console.error('❌ Error associating device:', error);
      showError(error.message || 'Error durante la asociación del dispositivo');
      setLoading(false);
    }
  };

  // Manejo de navegación después del éxito
  const handleSuccessNavigation = async () => {
    setLoading(false);

    Alert.alert(
      '¡Éxito!',
      'Dispositivo asociado correctamente',
      [
        {
          text: 'OK',
          onPress: () => {
            if (first === 'true') {
              // Es el primer dispositivo
              router.replace('/(private)/device');
            } else if (list === 'true') {
              // Viene desde lista
              router.back();
            } else if (map === 'true') {
              // Viene desde mapa
              router.back();
            } else {
              // Caso por defecto
              router.replace('/(private)/device');
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  // Abrir cámara para QR Scanner
  const openCamera = async () => {
    try {
      // Solicitar permisos de cámara usando el hook
      if (!cameraPermission) {
        // Aún no se han cargado los permisos
        return;
      }

      if (!cameraPermission.granted) {
        // Solicitar permisos
        const { granted } = await requestCameraPermission();
        
        if (!granted) {
          Alert.alert(
            'Permiso de cámara',
            'Necesitas dar permiso para usar la cámara y escanear códigos QR',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Permisos concedidos - navegar al scanner
      const navigationParams = {
        ...(first && { first }),
        ...(list && { list }),
        ...(map && { map }),
      };

      router.push({
        pathname: '/(private)/barcode-scanner',
        params: navigationParams,
      });
      
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      showError('Error al solicitar permisos de cámara');
    }
  };

  // Focus en siguiente campo
  const focusNextField = (ref: React.RefObject<TextInput>) => {
    ref.current?.focus();
  };

  // Navegación hacia atrás
  const handleGoBack = () => {
    router.back();
  };

  // Efectos
  useEffect(() => {
    setupLanguageAndTabs();
  }, []);

  // Renderizar contenido según carga
  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner visible={true} text="Loading..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Pairing device..." />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryButton} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('add_new_dev', lang)}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabContainer}>
        {routes.map((route) => (
          <Pressable
            key={route.key}
            style={[
              styles.tab,
              activeTab === route.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(route.key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === route.key && styles.activeTabText
            ]}>
              {route.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'serial' ? (
        <SerialTab
          serial={serial}
          name={name}
          lang={lang}
          onSerialChange={setSerial}
          onNameChange={setName}
          onAddDevice={handleAddDevice}
          nameRef={nameRef}
          onFocusNext={focusNextField}
          disabled={loading}
        />
      ) : (
        <QRTab
          lang={lang}
          onOpenCamera={openCamera}
        />
      )}
    </View>
  );
};

// Componente para tab de Serial
interface SerialTabProps {
  serial: string;
  name: string;
  lang: string;
  onSerialChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onAddDevice: () => void;
  nameRef: React.RefObject<TextInput>;
  onFocusNext: (ref: React.RefObject<TextInput>) => void;
  disabled: boolean;
}

const SerialTab: React.FC<SerialTabProps> = ({
  serial,
  name,
  lang,
  onSerialChange,
  onNameChange,
  onAddDevice,
  nameRef,
  onFocusNext,
  disabled,
}) => {
  return (
    <KeyboardAvoidingView 
      style={styles.tabContent} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        {/* Descripción */}
        <View style={styles.descriptionContainer}>
          <MaterialIcons name="devices" size={48} color={colors.primaryButton} />
          <Text style={styles.title}>
            Add by Serial Number          
          </Text>
          <Text style={styles.subtitle}>
            Enter the serial code and device name to link it to your account.
          </Text>
        </View>

        {/* Campo Serial */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            {t('serial_pl', lang)}
          </Text>
          <TextInput
            style={styles.textInput}
            value={serial}
            onChangeText={onSerialChange}
            placeholder={`Enter the ${t('serial_pl', lang).toLowerCase()}`}
            placeholderTextColor={colors.secondaryText}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => onFocusNext(nameRef)}
            editable={!disabled}
            maxLength={20}
          />
        </View>

        {/* Campo Nombre */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            {t('dev_name', lang)}
          </Text>
          <TextInput
            ref={nameRef}
            style={styles.textInput}
            value={name}
            onChangeText={onNameChange}
            placeholder={`Enter the ${t('dev_name', lang).toLowerCase()}`}
            placeholderTextColor={colors.secondaryText}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onAddDevice}
            editable={!disabled}
            maxLength={50}
          />
        </View>
      </View>

      {/* Botón Asociar */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[
            styles.primaryButton,
            (!serial.trim() || !name.trim() || disabled) && styles.disabledButton
          ]}
          onPress={onAddDevice}
          disabled={!serial.trim() || !name.trim() || disabled}
        >
          <Text style={styles.primaryButtonText}>
            {t('associate', lang).toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

// Componente para tab de QR
interface QRTabProps {
  lang: string;
  onOpenCamera: () => void;
}

const QRTab: React.FC<QRTabProps> = ({ lang, onOpenCamera }) => {
  return (
    <View style={styles.tabContent}>
      <View style={styles.qrContainer}>
        {/* Ícono QR en lugar de imagen (puedes cambiar por Image si tienes el asset) */}
        <View style={styles.qrIconContainer}>
          <MaterialIcons name="qr-code-scanner" size={120} color={colors.primaryButton} />
        </View>
        
        {/* Contenido */}
        <View style={styles.qrContent}>
          <Text style={styles.title}>
            {t('qr_scan', lang)}
          </Text>
          <Text style={styles.subtitle}>
            {t('qr_how', lang)}
          </Text>
        </View>
      </View>

      {/* Botón para iniciar escaneo */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.primaryButton}
          onPress={onOpenCamera}
        >
          <MaterialIcons name="camera-alt" size={20} color={colors.cardBackground} />
          <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
            {t('start_scan', lang).toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.tabActive,
  },
  tabText: {
    fontSize: 14,
    color: colors.tabInactive,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.tabActive,
    fontWeight: 'bold',
  },

  // Content styles
  tabContent: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  descriptionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryText,
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },

  // Input styles
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.primaryText,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    height: 56,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.primaryText,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  // Button styles
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  primaryButton: {
    height: 56,
    backgroundColor: colors.primaryButton,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: colors.secondaryText,
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: colors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // QR tab styles
  qrContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  qrIconContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  qrContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});

export default AddDeviceScreen;