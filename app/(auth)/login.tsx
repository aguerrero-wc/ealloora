// app/(auth)/login.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

  // Estados de focus para animaciones
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Usar contexto global para errores
  const { handleFirebaseAuthError } = useErrorContext();

  // Referencias
  const passwordRef = useRef<TextInput>(null);
  const popupDialogRef = useRef<GenericPopupDialogRef>(null);
  const popupDialogConfirmRef = useRef<GenericPopupDialogRef>(null);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
      setErrorPassword('The password must be at least 6 characters long');
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
    
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
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
          message: responseJson.message?.message || 'Server error. Please try again later.',
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
        setErrorRecover('There is no account with this email address');
      } else if (error.code === 'auth/invalid-email') {
        setErrorRecover(t('invalid_email', lang));
      } else {
        setErrorRecover('Error sending recovery email');
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
        text="Logging in" 
        color={colors.primaryButton}
      />
      
      <KeyboardAwareScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <ImageBackground
                  style={styles.logoImage}
                  source={require('../../assets/logoactionbar.png')}
                />
              </View>
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>
                {t('msg_welcome', lang)}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                  Log in to your account
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('email', lang)}</Text>
              <View style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused,
                errorEmail && styles.inputWrapperError
              ]}>
                <MaterialIcons 
                  name="email" 
                  size={20} 
                  color={emailFocused ? colors.primaryButton : colors.primaryLightInputText} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorEmail) setErrorEmail('');
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('email', lang)}
                  placeholderTextColor={colors.primaryLightInputText}
                  onSubmitEditing={focusPassword}
                  returnKeyType="next"
                />
              </View>
              {errorEmail ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color={colors.primaryDarkText} />
                  <Text style={styles.errorText}>{errorEmail}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('password', lang)}</Text>
              <View style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
                errorPassword && styles.inputWrapperError
              ]}>
                <MaterialIcons 
                  name="lock-outline" 
                  size={20} 
                  color={passwordFocused ? colors.primaryButton : colors.primaryLightInputText} 
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.textInput, styles.passwordInput]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorPassword) setErrorPassword('');
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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
                    size={22}
                    color={colors.primaryLightInputText}
                  />
                </Pressable>
              </View>
              {errorPassword ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color={colors.primaryDarkText} />
                  <Text style={styles.errorText}>{errorPassword}</Text>
                </View>
              ) : null}
            </View>

            {/* Forgot Password */}
            <View style={styles.forgotPasswordContainer}>
              <Pressable 
                onPress={() => {
                  setErrorRecover('');
                  popupDialogRef.current?.show();
                }}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>
                  {t('forgot_pass', lang)}
                </Text>
              </Pressable>
            </View>

            {/* Login Button */}
            <Pressable 
              style={[
                styles.loginButton, 
                loading && styles.loginButtonDisabled
              ]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <View style={styles.loginButtonContent}>
                <Text style={styles.loginButtonText}>
                  {t('login', lang)}
                </Text>
                <MaterialIcons 
                  name="arrow-forward" 
                  size={20} 
                  color="#fff" 
                  style={styles.loginButtonIcon}
                />
              </View>
            </Pressable>

            {/* Separator */}
            <View style={styles.separatorContainer}>
              <View style={styles.separator} />
              <View style={styles.orContainer}>
                <Text style={styles.orText}>{t('or', lang)}</Text>
              </View>
              <View style={styles.separator} />
            </View>

            {/* Registration Link */}
            <View style={styles.registrationContainer}>
              <Text style={styles.registrationQuestion}>
              {t('dont_have_an_account', lang)}
              </Text>
              <Pressable 
                onPress={() => router.push('/(auth)/registration')}
                style={styles.registrationButton}
              >
                <Text style={styles.registrationText}>
                  {t('registration', lang)}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Recovery Password Modal */}
      <GenericPopupDialog 
        ref={popupDialogRef}
        width={0.9}
        dialogStyle={styles.modalDialog}
        showMethod={(isVisible) => setPopupDialogIsVisible(isVisible)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="email" size={32} color={colors.primaryButton} />
              </View>
              <Text style={styles.modalTitle}>
                {t('email_address', lang)}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('insert_email', lang)} {t('recover_pass', lang)}
              </Text>
            </View>
            
            <View style={styles.modalInputContainer}>
              <View style={[
                styles.inputWrapper,
                styles.modalInputWrapper,
                errorRecover && styles.inputWrapperError
              ]}>
                <MaterialIcons 
                  name="email" 
                  size={20} 
                  color={colors.primaryLightInputText} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={recoverEmail}
                  onChangeText={(text) => {
                    setRecoverEmail(text);
                    if (errorRecover) setErrorRecover('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.primaryLightInputText}
                  returnKeyType="done"
                />
              </View>
              {errorRecover ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color={colors.primaryDarkText} />
                  <Text style={styles.errorText}>{errorRecover}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => popupDialogRef.current?.dismiss()}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>
                  {t('cancel', lang)}
                </Text>
              </Pressable>
              <Pressable 
                onPress={handleResetPassword}
                style={styles.modalSendButton}
              >
                <Text style={styles.modalSendText}>
                  {t('send', lang)}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GenericPopupDialog>

      {/* Confirmation Modal */}
      <GenericPopupDialog 
        ref={popupDialogConfirmRef}
        width={0.9}
        dialogStyle={styles.confirmModalDialog}
        showMethod={(isVisible) => setPopupDialogConfirmIsVisible(isVisible)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconContainer, styles.successIconContainer]}>
              <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
            </View>
            <Text style={styles.modalTitle}>
              Email sent!
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('check_your_email', lang)}
            </Text>
          </View>
          
          <View style={styles.modalActions}>
            <Pressable 
              onPress={() => popupDialogConfirmRef.current?.dismiss()}
              style={styles.modalOkButton}
            >
              <Text style={styles.modalOkText}>
                {t('ok', lang)}
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
    flex: 1,
    paddingHorizontal: 24,
  },
  backgroundImage: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : Constants.statusBarHeight + 40,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoWrapper: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 200,
    height: 44,
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Form Section
  formSection: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: colors.primaryButton,
    backgroundColor: '#ffffff',
    shadowOpacity: 0.15,
    elevation: 6,
  },
  inputWrapperError: {
    borderColor: colors.primaryDarkText,
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 12,
  },
  eyeIcon: {
    padding: 8,
    borderRadius: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
  },
  errorText: {
    color: colors.primaryDarkText,
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },

  // Forgot Password
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primaryButton,
    fontWeight: '600',
  },

  // Login Button
  loginButton: {
    backgroundColor: colors.primaryButton,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: colors.primaryButton,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: colors.primaryButton + '60',
    shadowOpacity: 0.1,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  loginButtonIcon: {
    marginLeft: 4,
  },

  // Separator
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  orContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  orText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Registration
  registrationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  registrationQuestion: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 4,
  },
  registrationButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  registrationText: {
    fontSize: 16,
    color: colors.primaryButton,
    fontWeight: '700',
  },

  // Modal Styles
  modalDialog: {
    borderRadius: 24,
    paddingVertical: 0,
  },
  confirmModalDialog: {
    borderRadius: 24,
    paddingVertical: 0,
  },
  modalContent: {
    padding: 32,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryButton + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconContainer: {
    backgroundColor: '#4CAF50' + '20',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalInputContainer: {
    marginBottom: 32,
  },
  modalInputWrapper: {
    marginBottom: 0,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalSendButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSendText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
  modalOkButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOkText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default LoginScreen;