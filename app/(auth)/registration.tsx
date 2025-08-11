// app/(auth)/registration.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';

// Constants
import api from '../../constants/api';
import { auth } from '../../constants/firebaseConfig';

// Contexts
import { useErrorContext } from '../../contexts/ErrorContext';

// Core
import { changeLangOnServer } from '../../core/requestsHelper';

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
  checkboxBorder: '#cccccc',
  policyText: '#999999',
  disabledButton: '#ffb9b9',
};

// Types para el componente
interface RegistrationData {
  entity: 'person' | 'company';
  name: string;
  surname?: string;
  city: string;
  cap: string;
  province: string;
  street: string;
  cf: string; // Código fiscal / VAT
  email: string;
  phone?: string;
  password: string;
  passwordConfirm: string;
  ppCheck: boolean; // Privacy Policy
  dcCheck: boolean; // Data Collection
}

type TabType = 'person' | 'company';

interface FormRefs {
  surnameRef: React.RefObject<TextInput>;
  emailRef: React.RefObject<TextInput>;
  phoneRef: React.RefObject<TextInput>;
  passwordRef: React.RefObject<TextInput>;
  confirmPasswordRef: React.RefObject<TextInput>;
}

const RegistrationScreen: React.FC = () => {
  const router = useRouter();
  const { showError } = useErrorContext();

  console.log('📝 RegistrationScreen: Pantalla de registro cargada');

  // Estados principales
  const [activeTab, setActiveTab] = useState<TabType>('person');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<keyof Languages>('en');

  // Estados del formulario
  const [formData, setFormData] = useState<RegistrationData>({
    entity: 'person',
    name: '',
    surname: '',
    city: '',
    cap: '',
    province: '',
    street: '',
    cf: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    ppCheck: false,
    dcCheck: false,
  });

  // Estados de errores
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    phone: '',
    matchPassword: '',
  });

  // Referencias para navegación entre campos
  const surnameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const refs: FormRefs = {
    surnameRef,
    emailRef,
    phoneRef,
    passwordRef,
    confirmPasswordRef,
  };

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

  // Funciones auxiliares
  const updateFormData = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      entity: activeTab === 'person' ? 'person' : 'company'
    }));
  };

  const updateError = (field: keyof typeof errors, value: string) => {
    setErrors(prev => ({ ...prev, [field]: value }));
  };

  const focusNextField = (ref: React.RefObject<TextInput>) => {
    ref.current?.focus();
  };

  const isFormValid = (): boolean => {
    const requiredFields = ['name', 'email', 'password', 'passwordConfirm'];
    const hasRequiredFields = requiredFields.every(field => 
      formData[field as keyof RegistrationData]
    );
    return hasRequiredFields && formData.ppCheck;
  };

  const handleRegister = async () => {
    console.log('🚀 RegistrationScreen: Iniciando registro...');
    
    // Limpiar errores anteriores
    setErrors({ email: '', password: '', phone: '', matchPassword: '' });

    // Validar confirmación de password
    if (formData.password !== formData.passwordConfirm) {
      const errorMsg = 'Passwords do not match';
      updateError('password', errorMsg);
      updateError('matchPassword', errorMsg);
      return;
    }

    setLoading(true);

    try {
      // Preparar datos para la API
      const registrationPayload = {
        email: formData.email,
        emailVerified: false,
        password: formData.password,
        disabled: false,
        role: 1,
        privacy_policy: formData.ppCheck,
        data_collection: formData.dcCheck,
        address: activeTab === 'person' ? {
          entity: 'person',
          address: formData.street,
          zip_code: formData.cap,
          province: formData.province,
          city: formData.city,
          name: formData.name,
          surname: formData.surname,
          fiscal_code: formData.cf
        } : {
          entity: 'company',
          address: formData.street,
          zip_code: formData.cap,
          province: formData.province,
          city: formData.city,
          company_name: formData.name,
          vat: formData.cf
        }
      };

      // Llamada a la API para crear usuario
      const response = await fetch(`${api.endpoint}user`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationPayload),
      });

      const responseJson = await response.json();

      if (responseJson.status_code === 400) {
        // Manejar errores de la API
        handleRegistrationError(responseJson);
        setLoading(false);
        return;
      }

      if (responseJson.status_code >= 400) {
        throw new Error(responseJson.message || 'Error del servidor');
      }

      // Registro exitoso - hacer login automático
      await performAutoLogin();

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      showError(error.message || 'Error en el registro. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleRegistrationError = (error: any) => {
    let emailError = '';
    let passwordError = '';
    let phoneError = '';

    if (error.code) {
      switch (error.code) {
        case 'auth/invalid-email':
          emailError = t('invalid_email', lang);
          break;
        case 'auth/weak-password':
          passwordError = 'Inserta una contraseña de al menos 6 caracteres';
          break;
        case 'auth/email-already-in-use':
        case 'auth/email-already-exists':
          emailError = 'Email ya registrado';
          break;
        case 'auth/invalid-phone-number':
          phoneError = 'Inserta un número de teléfono válido con prefijo';
          break;
        default:
          showError(error.message || 'Error de registro');
          return;
      }
    } else if (error.errors && error.errors[0]) {
      showError(error.errors[0].message);
      return;
    } else {
      showError(error.message || 'Error desconocido');
      return;
    }

    setErrors({ email: emailError, password: passwordError, phone: phoneError, matchPassword: '' });
  };

  const performAutoLogin = async () => {
    try {
      console.log('🔐 RegistrationScreen: Realizando auto-login...');
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;
      const token = await user.getIdToken();

      // Verificar dispositivos del usuario
      const devicesResponse = await fetch(
        `${api.endpoint}user/${user.uid}?scope=devices`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const devicesJson = await devicesResponse.json();

      if (devicesJson.status_code === 400) {
        throw new Error(devicesJson.message?.message || 'Error verificando dispositivos');
      }

      // Guardar usuario en AsyncStorage (opcional, Firebase ya maneja persistencia)
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Actualizar idioma en servidor
      try {
        await changeLangOnServer(lang, user.uid);
        console.log('✅ Idioma actualizado en servidor');
      } catch (error) {
        console.warn('⚠️ Error actualizando idioma en servidor:', error);
        // No bloquear el flujo por error de idioma
      }

      // Navegar según dispositivos
      console.log('Devices count:', devicesJson.devices?.length || 0);
      
      if (devicesJson.devices && devicesJson.devices.length > 0) {
        // Usuario tiene dispositivos - ir a pantalla de dispositivos
        router.replace('/(private)/device');
        console.log('✅ RegistrationScreen: Navegando a dispositivos existentes');
      } else {
        // Usuario nuevo sin dispositivos - ir a agregar dispositivo
        router.replace('/(private)/add-device?first=true');
        console.log('✅ RegistrationScreen: Navegando a agregar primer dispositivo');
      }

      setLoading(false);

    } catch (error: any) {
      console.error('❌ Auto-login error:', error);
      showError('Registro exitoso pero error en login automático');
      setLoading(false);
      
      // Volver al login
      router.replace('/(auth)/login');
    }
  };

  // Navegación hacia atrás
  const handleGoBack = () => {
    router.back();
  };

  // Effects
  useEffect(() => {
    setupLanguage();
  }, []);

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Registering user..." />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryButton} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('registration', lang)}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'person' && styles.activeTab]}
          onPress={() => setActiveTab('person')}
        >
          <Text style={[styles.tabText, activeTab === 'person' && styles.activeTabText]}>
            User
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'company' && styles.activeTab]}
          onPress={() => setActiveTab('company')}
        >
          <Text style={[styles.tabText, activeTab === 'company' && styles.activeTabText]}>
            Company
          </Text>
        </Pressable>
      </View>

      {/* Form Content */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        {activeTab === 'person' ? (
          <PersonForm
            formData={formData}
            errors={errors}
            lang={lang}
            refs={refs}
            onUpdateField={updateFormData}
            onFocusNext={focusNextField}
          />
        ) : (
          <CompanyForm
            formData={formData}
            errors={errors}
            lang={lang}
            refs={refs}
            onUpdateField={updateFormData}
            onFocusNext={focusNextField}
          />
        )}

        {/* Privacy Policy & Data Collection */}
        <PolicySection
          formData={formData}
          lang={lang}
          onUpdateField={updateFormData}
        />

        {/* Register Button */}
        <Pressable
          style={[
            styles.registerButton,
            !isFormValid() && styles.disabledButton
          ]}
          onPress={handleRegister}
          disabled={!isFormValid() || loading}
        >
          <Text style={styles.registerButtonText}>
            {t('confirm_reg', lang).toUpperCase()}
          </Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>
    </View>
  );
};

// Componente para formulario de persona
interface FormProps {
  formData: RegistrationData;
  errors: any;
  lang: string;
  refs: FormRefs;
  onUpdateField: (field: keyof RegistrationData, value: any) => void;
  onFocusNext: (ref: React.RefObject<TextInput>) => void;
}

const PersonForm: React.FC<FormProps> = ({ formData, errors, lang, refs, onUpdateField, onFocusNext }) => (
  <View style={styles.formContainer}>
    <Text style={styles.sectionTitle}>
      {t('account_data', lang).toUpperCase()}
    </Text>
    
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t('name', lang)}</Text>
      <TextInput
        style={styles.textInput}
        value={formData.name}
        onChangeText={(value) => onUpdateField('name', value)}
        placeholder={t('name', lang)}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => onFocusNext(refs.surnameRef)}
      />
    </View>

    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t('surname', lang)}</Text>
      <TextInput
        ref={refs.surnameRef}
        style={styles.textInput}
        value={formData.surname}
        onChangeText={(value) => onUpdateField('surname', value)}
        placeholder={t('surname', lang)}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => onFocusNext(refs.emailRef)}
      />
    </View>

    <Text style={styles.sectionTitle}>
      {t('registration_data', lang).toUpperCase()}
    </Text>

    <RegistrationFields 
      formData={formData}
      errors={errors}
      lang={lang}
      refs={refs}
      onUpdateField={onUpdateField}
      onFocusNext={onFocusNext}
    />
  </View>
);

// Componente para formulario de empresa
const CompanyForm: React.FC<FormProps> = ({ formData, errors, lang, refs, onUpdateField, onFocusNext }) => (
  <View style={styles.formContainer}>
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Company name</Text>
      <TextInput
        style={styles.textInput}
        value={formData.name}
        onChangeText={(value) => onUpdateField('name', value)}
        placeholder="Company name"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => onFocusNext(refs.emailRef)}
      />
    </View>

    <RegistrationFields 
      formData={formData}
      errors={errors}
      lang={lang}
      refs={refs}
      onUpdateField={onUpdateField}
      onFocusNext={onFocusNext}
      isCompany={true}
    />
  </View>
);

// Campos comunes de registro
interface RegistrationFieldsProps extends FormProps {
  isCompany?: boolean;
}

const RegistrationFields: React.FC<RegistrationFieldsProps> = ({ 
  formData, errors, lang, refs, onUpdateField, onFocusNext, isCompany = false 
}) => (
  <>
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        ref={refs.emailRef}
        style={[styles.textInput, errors.email ? styles.textInputError : null]}
        value={formData.email}
        onChangeText={(value) => onUpdateField('email', value)}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => onFocusNext(refs.passwordRef)}
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
    </View>

    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t('password', lang)}</Text>
      <TextInput
        ref={refs.passwordRef}
        style={[styles.textInput, errors.password ? styles.textInputError : null]}
        value={formData.password}
        onChangeText={(value) => onUpdateField('password', value)}
        placeholder={t('password', lang)}
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => onFocusNext(refs.confirmPasswordRef)}
      />
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
    </View>

    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{t('confirm_pass', lang)}</Text>
      <TextInput
        ref={refs.confirmPasswordRef}
        style={[styles.textInput, errors.matchPassword ? styles.textInputError : null]}
        value={formData.passwordConfirm}
        onChangeText={(value) => onUpdateField('passwordConfirm', value)}
        placeholder={t('confirm_pass', lang)}
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="done"
      />
      {errors.matchPassword ? <Text style={styles.errorText}>{errors.matchPassword}</Text> : null}
    </View>
  </>
);

// Sección de políticas
interface PolicySectionProps {
  formData: RegistrationData;
  lang: string;
  onUpdateField: (field: keyof RegistrationData, value: any) => void;
}

const PolicySection: React.FC<PolicySectionProps> = ({ formData, lang, onUpdateField }) => (
  <View style={styles.policyContainer}>
    <View style={styles.checkboxContainer}>
      <Pressable
        style={[styles.checkbox, formData.ppCheck && styles.checkboxChecked]}
        onPress={() => onUpdateField('ppCheck', !formData.ppCheck)}
      >
        {formData.ppCheck && (
          <MaterialIcons name="check" size={16} color={colors.primaryButton} />
        )}
      </Pressable>
      <Text style={styles.policyText}>
        {t('privacy_policy1', lang)}
        <Text 
          style={styles.policyLink}
          onPress={() => Linking.openURL(t('link', lang))}
        >
          {t('privacy_policy2', lang)}
        </Text>
        {t('privacy_policy3', lang)}
      </Text>
    </View>

    <View style={styles.checkboxContainer}>
      <Pressable
        style={[styles.checkbox, formData.dcCheck && styles.checkboxChecked]}
        onPress={() => onUpdateField('dcCheck', !formData.dcCheck)}
      >
        {formData.dcCheck && (
          <MaterialIcons name="check" size={16} color={colors.primaryButton} />
        )}
      </Pressable>
      <Text style={styles.policyText}>
        {t('data_collection', lang)}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
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
  scrollView: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.primaryText,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryText,
    paddingBottom: 8,
    marginBottom: 16,
    marginTop: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.primaryText,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    height: 56,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.primaryText,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  textInputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  policyContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.checkboxBorder,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  checkboxChecked: {
    borderColor: colors.primaryButton,
    backgroundColor: colors.cardBackground,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: colors.policyText,
    lineHeight: 16,
  },
  policyLink: {
    color: colors.primaryButton,
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: colors.primaryButton,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: colors.disabledButton,
    elevation: 0,
    shadowOpacity: 0,
  },
  registerButtonText: {
    color: colors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default RegistrationScreen;