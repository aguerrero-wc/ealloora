// app/(private)/barcode-scanner.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Localization from 'expo-localization';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

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
  background: '#000000',
  cardBackground: '#ffffff',
  success: '#4CAF50',
  overlay: 'rgba(0, 0, 0, 0.7)',
  scannerFrame: '#ffffff',
};

const BarcodeScannerScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Type-safe access to params
  const first = params.first as string | undefined;
  const list = params.list as string | undefined;
  const map = params.map as string | undefined;

  // Estados
  const [scanned, setScanned] = useState(false);
  const [lang, setLang] = useState<keyof Languages>('en');
  
  // Hook moderno para permisos de cámara
  const [permission, requestPermission] = useCameraPermissions();

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

  // Solicitar permisos al montar el componente
  useEffect(() => {
    setupLanguage();
    
    if (permission === null) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Manejo del escaneo de código de barras
  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return; // Evitar múltiples escaneos

    setScanned(true);
    console.log('📱 QR Code scanned:', { type, data });

    // Preparar parámetros para la navegación
    const navigationParams = {
      code: data,
      ...(first && { first }),
      ...(list && { list }),
      ...(map && { map }),
    };

    // Pequeño delay para mostrar el feedback visual
    setTimeout(() => {
      // Navegar a qr-device con el código escaneado
      router.replace({
        pathname: '/(private)/qr-device',
        params: navigationParams,
      });
    }, 500);
  };

  // Función para volver a escanear
  const resetScanner = () => {
    setScanned(false);
  };

  // Función para ir hacia atrás
  const handleGoBack = () => {
    router.back();
  };

  // Renderizado condicional basado en permisos
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" />
        <MaterialIcons name="camera" size={64} color={colors.secondaryText} />
        <Text style={styles.text}>Solicitando permiso para usar la cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" />
        <MaterialIcons name="camera-alt" size={64} color={colors.secondaryText} />
        <Text style={styles.text}>Sin acceso a la cámara</Text>
        <Text style={styles.subtext}>
          Ve a configuración y habilita el permiso de cámara para esta aplicación
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Solicitar permiso</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>{t('back', lang)}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header con botón de cerrar */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.headerButton}>
          <MaterialIcons name="close" size={24} color={colors.cardBackground} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('qr_scan', lang)}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Cámara con scanner */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay con marco de escaneo */}
      <View style={styles.overlay}>
        {/* Frame del scanner */}
        <View style={styles.scannerFrame}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          
          {/* Línea de escaneo animada (opcional) */}
          <View style={styles.scanLine} />
        </View>

        {/* Instrucciones */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Apunta la cámara hacia el código QR
          </Text>
          <Text style={styles.instructionsSubtext}>
            El código se escaneará automáticamente
          </Text>
        </View>

        {/* Indicador de escaneo exitoso */}
        {scanned && (
          <View style={styles.scannedContainer}>
            <MaterialIcons name="check-circle" size={32} color={colors.success} />
            <Text style={styles.scannedText}>✓ Código escaneado</Text>
            <Text style={styles.scannedSubtext}>Procesando...</Text>
          </View>
        )}

        {/* Botón para volver a escanear (si ya escaneó) */}
        {scanned && (
          <Pressable style={styles.rescanButton} onPress={resetScanner}>
            <MaterialIcons name="refresh" size={20} color={colors.cardBackground} />
            <Text style={styles.rescanButtonText}>Escanear de nuevo</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: colors.overlay,
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardBackground,
  },
  text: {
    fontSize: 18,
    color: colors.cardBackground,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: colors.primaryButton,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: colors.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  backButtonText: {
    color: '#ccc',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.scannerFrame,
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primaryButton,
    opacity: 0.8,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: colors.cardBackground,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  instructionsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  scannedContainer: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: colors.overlay,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  scannedText: {
    fontSize: 18,
    color: colors.success,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },
  scannedSubtext: {
    fontSize: 14,
    color: colors.cardBackground,
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  rescanButtonText: {
    color: colors.cardBackground,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default BarcodeScannerScreen;