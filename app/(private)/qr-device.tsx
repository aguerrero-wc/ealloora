// app/(private)/qr-device.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    View,
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
};

const QRDeviceScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { showError } = useErrorContext();
  
  // Type-safe access to params
  const code = params.code as string | undefined;
  const first = params.first as string | undefined;
  const list = params.list as string | undefined;
  const map = params.map as string | undefined;
  
  // Estados
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<keyof Languages>('en');

  // Referencias
  const nameRef = useRef<TextInput>(null);

  // Configurar idioma
  const setupLanguage = async () => {
    try {
      const storedLang = await AsyncStorage.getItem('lang');
      if (storedLang) {
        const langCode = storedLang.substring(0, 2) as keyof Languages;
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

  // Función principal para asociar dispositivo
  const handleAddDevice = async () => {
    // Obtener el código del QR desde los parámetros
    const serial = code || '';

    // Validaciones
    if (!serial) {
      showError('Código QR no válido');
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
      // Obtener token del usuario autenticado
      const accessToken = await user.getIdToken(true);

      // Llamada a la API para asociar dispositivo
      const response = await fetch(
        `${api.endpoint}device/${serial}?action=associate`,
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

      if (responseJson.status_code === 405) {
        console.log('Error 405:', responseJson);
        Alert.alert(
          'Error',
          'Código QR no válido. Escanea un código QR válido',
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
              // Es el primer dispositivo - ir a device list
              router.replace('/(private)/device');
            } else if (list === 'true') {
              // Viene desde lista - volver a lista
              router.back();
            } else if (map === 'true') {
              // Viene desde mapa - volver a mapa
              router.back();
            } else {
              // Caso por defecto - ir a device list
              router.replace('/(private)/device');
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  // Navegación hacia atrás
  const handleGoBack = () => {
    router.back();
  };

  // Effects
  useEffect(() => {
    setupLanguage();
  }, []);

  useEffect(() => {
    // Focus automático en el campo de nombre
    const timer = setTimeout(() => {
      nameRef.current?.focus();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Asociando dispositivo..." />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryButton} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('scanned_qr', lang)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Descripción */}
        <View style={styles.descriptionContainer}>
          <MaterialIcons name="qr-code-scanner" size={48} color={colors.primaryButton} />
          <Text style={styles.title}>
            Código QR Escaneado
          </Text>
          <Text style={styles.subtitle}>
            El código QR se escaneó correctamente. Agrega un nombre para completar la asociación del dispositivo.
          </Text>
        </View>

        {/* Información del QR Code */}
        {code && (
          <View style={styles.qrInfoContainer}>
            <Text style={styles.qrInfoLabel}>Código escaneado:</Text>
            <Text style={styles.qrInfoText}>{code}</Text>
          </View>
        )}

        {/* Campo de nombre del dispositivo */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('dev_name', lang)}</Text>
          <TextInput
            ref={nameRef}
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder={`Ingresa el ${t('dev_name', lang).toLowerCase()}`}
            placeholderTextColor={colors.secondaryText}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleAddDevice}
            maxLength={50}
          />
        </View>

        {/* Botones */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.primaryButton,
              (!name.trim() || loading) && styles.disabledButton
            ]}
            onPress={handleAddDevice}
            disabled={!name.trim() || loading}
          >
            <Text style={styles.primaryButtonText}>
              {t('associate', lang).toUpperCase()}
            </Text>
          </Pressable>
          
          <Pressable
            style={styles.secondaryButton}
            onPress={handleGoBack}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>
              {t('cancel', lang)}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  content: {
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
  qrInfoContainer: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryButton,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qrInfoLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qrInfoText: {
    fontSize: 16,
    color: colors.primaryText,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '500',
  },
  inputContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.primaryText,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    height: 56,
    backgroundColor: colors.cardBackground,
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
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  primaryButton: {
    height: 56,
    backgroundColor: colors.primaryButton,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  secondaryButton: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  secondaryButtonText: {
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default QRDeviceScreen;