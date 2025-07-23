// app/(auth)/login.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Firebase v11 imports
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth as firebaseAuth } from '../../constants/firebaseConfig';

// Expo Router imports
import { useRouter } from 'expo-router';

// Local imports
import LoadingSpinner from '../../components/LoadingSpinner';
import GenericPopupDialog, { GenericPopupDialogRef } from '../../components/popup/GenericPopupDialog';
import api from '../../constants/api';
import colors from '../../constants/Colors';
import { useErrorContext } from '../../contexts/ErrorContext';
import { changeLangOnServer } from '../../core/requestsHelper';

// Language imports (archivos TypeScript)
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

// Función de traducción mejorada
const t = (key: TranslationKeys, locale: string): string => {
  return translate(key, locale as keyof Languages, translations);
};

const LoginScreen: React.FC = () => {
  const router = useRouter();
  
  // Estados principales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [lang, setLang] = useState('en');
  
  // Estados de error para inputs
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorRecover, setErrorRecover] = useState('');

  // Estados de modales
  const [popupDialogIsVisible, setPopupDialogIsVisible] = useState(false);
  const [popupDialogConfirmIsVisible, setPopupDialogConfirmIsVisible] = useState(false);

  // Usar contexto global para errores
  const { handleFirebaseAuthError } = useErrorContext();

  // Referencias
  const passwordRef = useRef<TextInput>(null);
  const popupDialogRef = useRef<GenericPopupDialogRef>(null);
  const popupDialogConfirmRef = useRef<GenericPopupDialogRef>(null);

  console.log('🔑 LoginScreen: Renderizando...');

  // Funciones auxiliares
  const handleChangeLangOnServer = async (language: string, userId: string) => {
    try {
      const result = await changeLangOnServer(language, userId);
      if (!result.success) {
        console.error('Failed to change language on server:', result.error);
      }
    } catch (error) {
      console.error('Error changing language on server:', error);
    }
  };

  const validateInputs = (): boolean => {
    let isValid = true;
    
    setErrorEmail('');
    setErrorPassword('');

    if (!email.trim()) {
      setErrorEmail(t('invalid_email', lang));
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorEmail(t('invalid_email', lang));
      isValid = false;
    }

    if (!password.trim()) {
      setErrorPassword(t('invalid_pass', lang));
      isValid = false;
    } else if (password.length < 6) {
      setErrorPassword('La contraseña debe tener al menos 6 caracteres');
      isValid = false;
    }

    return isValid;
  };

  const setupLanguage = async () => {
    try {
      const storedLang = await AsyncStorage.getItem('lang');
      
      if (storedLang) {
        setLang(storedLang.substring(0, 2));
      } else {
        const locale = Localization.getLocales()[0];
        console.log('Current locale:', locale);
        setLang('en');
        await AsyncStorage.setItem('lang', locale.languageCode || 'en');
      }
    } catch (error) {
      console.error('Language setup error:', error);
      setLang('en');
    }
  };

  // Efectos
  useEffect(() => {
    console.log('🔄 LoginScreen: useEffect ejecutado');
    setupLanguage();
  }, []);

  // Funciones de manejo
  const handleLogin = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 LoginScreen: Intentando autenticación...');
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseUser = userCredential.user;

      // Obtener token del usuario
      const token = await firebaseUser.getIdToken();
      
      // Llamada a la API para obtener datos del usuario
      const response = await fetch(`${api.endpoint}user/${firebaseUser.uid}?scope=devices`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();

      if (responseJson.status_code === 400) {
        handleFirebaseAuthError({
          message: responseJson.message?.message || 'Error en el servidor. Intenta más tarde.',
          status: 400
        }, handleLogin);
        setLoading(false);
        return;
      }

      // Actualizar idioma en el servidor
      await handleChangeLangOnServer(lang, firebaseUser.uid);

      console.log('✅ LoginScreen: Login exitoso. Devices:', responseJson.devices.length);

      // El AuthProvider automáticamente detectará el cambio de estado
      // y redirigirá a las rutas privadas
      
      setLoading(false);
    } catch (error: any) {
      console.log('❌ LoginScreen: Error de login:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      
      setLoading(false);
      
      // Usar el contexto global para manejo de errores con retry
      handleFirebaseAuthError(error, handleLogin);
    }
  };

  const handleResetPassword = async () => {
    if (!recoverEmail.trim()) {
      setErrorRecover(t('invalid_email', lang));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(recoverEmail)) {
      setErrorRecover(t('invalid_email', lang));
      return;
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, recoverEmail);
      popupDialogRef.current?.dismiss();
      popupDialogConfirmRef.current?.show();
      setErrorRecover('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setErrorRecover('No existe una cuenta con este email');
      } else if (error.code === 'auth/invalid-email') {
        setErrorRecover(t('invalid_email', lang));
      } else {
        setErrorRecover('Error al enviar email de recuperación');
      }
    }
  };

  const focusPassword = () => {
    passwordRef.current?.focus();
  };

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  return (
    <View style={styles.backgroundImage}>
      {/* Loading Spinner */}
      <LoadingSpinner 
        visible={loading} 
        text="Iniciando sesión..." 
        color={colors.primaryButton}
      />
      
      <KeyboardAwareScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <ImageBackground
            style={styles.logoImage}
            source={require('../../assets/logoactionbar.png')}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('email', lang)}</Text>
          <TextInput
            style={[styles.textInput, errorEmail ? styles.textInputError : null]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorEmail) setErrorEmail('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('email', lang)}
            placeholderTextColor={colors.primaryLightInputText}
            onSubmitEditing={focusPassword}
            returnKeyType="next"
          />
          {errorEmail ? <Text style={styles.errorText}>{errorEmail}</Text> : null}
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('password', lang)}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordRef}
              style={[styles.textInput, styles.passwordInput, errorPassword ? styles.textInputError : null]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorPassword) setErrorPassword('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={secureTextEntry}
              placeholder={t('password', lang)}
              placeholderTextColor={colors.primaryLightInputText}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={toggleSecureTextEntry} style={styles.eyeIcon}>
              <MaterialIcons
                name={secureTextEntry ? 'visibility' : 'visibility-off'}
                size={24}
                color={colors.primaryLightInputTextAccent}
              />
            </Pressable>
          </View>
          {errorPassword ? <Text style={styles.errorText}>{errorPassword}</Text> : null}
        </View>

        {/* Forgot Password */}
        <Pressable onPress={() => {
          setErrorRecover('');
          popupDialogRef.current?.show();
        }}>
          <Text style={styles.forgotPasswordText}>
            {t('forgot_pass', lang)}
          </Text>
        </Pressable>

        {/* Login Button */}
        <Pressable 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {t('login', lang).toUpperCase()}
          </Text>
        </Pressable>

        {/* Separator */}
        <View style={styles.separatorContainer}>
          <View style={styles.separator} />
          <Text style={styles.orText}>{t('or', lang)}</Text>
          <View style={styles.separator} />
        </View>

        {/* Registration Link */}
        <View style={styles.registrationContainer}>
          <Pressable onPress={() => router.push('/(auth)/registration')}>
            <Text style={styles.registrationText}>
              {t('registration', lang).toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      {/* Recovery Password Modal */}
      <GenericPopupDialog 
        ref={popupDialogRef}
        width={0.85}
        dialogStyle={{ height: 272 }}
        showMethod={(isVisible) => setPopupDialogIsVisible(isVisible)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('email_address', lang)}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('insert_email', lang)}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('recover_pass', lang)}
            </Text>
            
            <TextInput
              style={[styles.textInput, errorRecover ? styles.textInputError : null]}
              value={recoverEmail}
              onChangeText={(text) => {
                setRecoverEmail(text);
                if (errorRecover) setErrorRecover('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Email"
              placeholderTextColor={colors.primaryLightInputText}
              returnKeyType="done"
            />
            {errorRecover ? <Text style={styles.errorText}>{errorRecover}</Text> : null}
            
            <View style={styles.modalActions}>
              <Pressable onPress={() => popupDialogRef.current?.dismiss()}>
                <Text style={styles.modalActionText}>
                  {t('cancel', lang).toUpperCase()}
                </Text>
              </Pressable>
              <Pressable onPress={handleResetPassword}>
                <Text style={styles.modalActionText}>
                  {t('send', lang).toUpperCase()}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GenericPopupDialog>

      {/* Confirmation Modal */}
      <GenericPopupDialog 
        ref={popupDialogConfirmRef}
        width={0.85}
        dialogStyle={{ height: 212 }}
        showMethod={(isVisible) => setPopupDialogConfirmIsVisible(isVisible)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {t('email_address', lang)}
          </Text>
          <Text style={styles.modalSubtitle}>
            {t('check_your_email', lang)}
          </Text>
          
          <View style={styles.modalActions}>
            <Pressable onPress={() => popupDialogConfirmRef.current?.dismiss()}>
              <Text style={styles.modalActionText}>
                {t('ok', lang).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
      </GenericPopupDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'ios' ? 20 : Constants.statusBarHeight,
  },
  backgroundImage: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 256,
    height: 56,
    marginTop: 24,
  },
  inputContainer: {
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.primaryLightInputText,
    marginBottom: 8,
    paddingLeft: 12,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.primaryLightInputText,
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.primaryLightInputEdit,
    backgroundColor: '#fff',
  },
  textInputError: {
    borderColor: colors.primaryDarkText,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 13,
    padding: 8,
  },
  errorText: {
    color: colors.primaryDarkText,
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'right',
    marginTop: 12,
  },
  loginButton: {
    backgroundColor: colors.primaryButton,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  loginButtonDisabled: {
    backgroundColor: colors.primaryButton + '80',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: colors.black,
    marginHorizontal: 16,
  },
  orText: {
    fontSize: 14,
    color: colors.black,
    paddingHorizontal: 16,
  },
  registrationContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 24,
  },
  registrationText: {
    fontSize: 14,
    color: colors.primaryText,
    padding: 8,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    color: '#000',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 24,
    gap: 24,
  },
  modalActionText: {
    fontSize: 14,
    color: colors.primaryButton,
    fontWeight: 'bold',
  },
});

export default LoginScreen;