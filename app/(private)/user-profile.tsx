// app/(private)/user-profile.tsx
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';
import PrivateHeader from '../../components/PrivateHeader';

// Constants
import api from '../../constants/api';
import colors from '../../constants/Colors';
import { auth } from '../../constants/firebaseConfig';

// Contexts
import { useAuth } from '../../contexts/AuthContext';
import { useErrorContext } from '../../contexts/ErrorContext';

// Función para obtener versión de la app
const getVersion = (version?: string, buildNumber?: string): string => {
  let verBuild = 'Version: ' + (version || '1.0.0');
  if (buildNumber) {
    verBuild = verBuild + ' (' + buildNumber + ')';
  }
  return verBuild;
};

const UserProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showError } = useErrorContext();

  // Estados principales
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Estados para formularios
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [oldPasswordError, setOldPasswordError] = useState('');
  const [oldPasswordFocused, setOldPasswordFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Estados para mostrar/ocultar passwords
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('✅ User logged out');
            } catch (error) {
              console.error('❌ Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  // Eliminar cuenta
  const handleDeleteAccount = async () => {
    Alert.alert(
      '⚠️ Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Obtener token del usuario
              const accessToken = await user.getIdToken(true);

              // Llamada a la API para eliminar cuenta
              const response = await fetch(`${api.endpoint}user/${user.uid}`, {
                method: 'DELETE',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const responseJson = await response.json();

              if (responseJson.status_code >= 400) {
                throw new Error(responseJson.message || 'Server error');
              }

              console.log('✅ Account deleted successfully:', responseJson);
              
              // Logout automático
              await signOut(auth);
              
              setLoading(false);
              
              // Mensaje de confirmación
              Alert.alert(
                '✅ Account Deleted',
                'Your account has been successfully deleted. Thank you for using our service.',
                [{ text: 'OK' }]
              );

            } catch (error: any) {
              console.error('❌ Error deleting account:', error);
              setLoading(false);
              
              Alert.alert(
                '❌ Error',
                error.message || 'Failed to delete account. Please try again later.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  // Cambiar email
  const handleChangeEmail = async () => {
    if (!user || !newEmail.trim()) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setEmailError('');

      await updateEmail(user, newEmail.trim());
      
      setEmailModalVisible(false);
      setNewEmail('');
      Alert.alert(
        'Success',
        'Your email has been updated successfully',
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('❌ Error updating email:', error);
      if (error.code === 'auth/requires-recent-login') {
        setEmailError('Please log out and log in again before changing your email');
      } else {
        setEmailError('Failed to update email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reautenticar usuario
  const reauthenticate = async (currentPassword: string) => {
    if (!user || !user.email) {
      throw new Error('No user email found');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    return reauthenticateWithCredential(user, credential);
  };

  // Cambiar password
  const handleChangePassword = async () => {
    if (!user) return;

    // Reset errors
    setPasswordError('');
    setOldPasswordError('');

    // Validaciones
    if (!oldPassword.trim() || oldPassword.length < 6) {
      setOldPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // Reautenticar antes de cambiar password
      await reauthenticate(oldPassword);
      
      // Actualizar password
      await updatePassword(user, newPassword);
      
      setPasswordModalVisible(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      Alert.alert(
        'Success',
        'Your password has been updated successfully',
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('❌ Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setOldPasswordError('Current password is incorrect');
      } else {
        setPasswordError(error.message || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Updating..." />

      {/* Header */}
      <PrivateHeader 
        title="My Profile"
        showBack={true}
        showMenu={false}
        showLogout={false}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>


        {/* Account Section */}
        <View style={[styles.section, styles.sectionAccount]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="account-circle" size={24} color={colors.primaryButton} />
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>

          {/* Email Setting */}
          <TouchableOpacity 
            style={styles.settingCard}
            onPress={() => setEmailModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <MaterialIcons name="email" size={20} color={colors.primaryButton} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Email Address</Text>
              <Text style={styles.settingValue}>{user?.email || 'No email'}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Password Setting */}
          <TouchableOpacity 
            style={styles.settingCard}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <MaterialIcons name="lock" size={20} color={colors.primaryButton} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Password</Text>
              <Text style={styles.settingValue}>••••••••••</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={24} color={colors.primaryButton} />
            <Text style={styles.sectionTitle}>Actions</Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.settingCard, styles.logoutCard]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIconContainer, styles.logoutIconContainer]}>
              <MaterialIcons name="logout" size={20} color="#ef4444" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.logoutLabel]}>Logout</Text>
              <Text style={styles.settingValue}>Sign out of your account</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <View style={[styles.sectionHeader, styles.dangerHeader]}>
            <MaterialIcons name="warning" size={24} color="#dc2626" />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          </View>

          {/* Delete Account Button */}
          <TouchableOpacity 
            style={[styles.settingCard, styles.deleteCard]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIconContainer, styles.deleteIconContainer]}>
              <MaterialIcons name="delete-forever" size={20} color="#dc2626" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.deleteLabel]}>Delete Account</Text>
              <Text style={[styles.settingValue, styles.deleteValue]}>Permanently delete your account and all data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            {getVersion(Constants.expoConfig?.version, undefined)}
          </Text>
        </View>
      </ScrollView>

      {/* Email Modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="email" size={32} color={colors.primaryButton} />
                </View>
                <Text style={styles.modalTitle}>Update Email</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your new email address below
                </Text>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Email</Text>
                  <View style={[
                    styles.inputWrapper,
                    emailFocused && styles.inputWrapperFocused,
                    emailError && styles.inputWrapperError
                  ]}>
                    <MaterialIcons 
                      name="email" 
                      size={20} 
                      color={emailFocused ? colors.primaryButton : '#9ca3af'} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={newEmail}
                      onChangeText={(text) => {
                        setNewEmail(text);
                        if (emailError) setEmailError('');
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="Enter new email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {emailError ? (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{emailError}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  onPress={() => {
                    setEmailModalVisible(false);
                    setNewEmail('');
                    setEmailError('');
                  }}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  onPress={handleChangeEmail}
                  style={[styles.modalConfirmButton, (!newEmail.trim() || loading) && styles.modalConfirmButtonDisabled]}
                  disabled={!newEmail.trim() || loading}
                >
                  <Text style={styles.modalConfirmText}>Update</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="lock" size={32} color={colors.primaryButton} />
                </View>
                <Text style={styles.modalTitle}>Update Password</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your current password and choose a new one
                </Text>
              </View>

              <View style={styles.modalContent}>
                {/* Current Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={[
                    styles.inputWrapper,
                    oldPasswordFocused && styles.inputWrapperFocused,
                    oldPasswordError && styles.inputWrapperError
                  ]}>
                    <MaterialIcons 
                      name="lock-outline" 
                      size={20} 
                      color={oldPasswordFocused ? colors.primaryButton : '#9ca3af'} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={oldPassword}
                      onChangeText={(text) => {
                        setOldPassword(text);
                        if (oldPasswordError) setOldPasswordError('');
                      }}
                      onFocus={() => setOldPasswordFocused(true)}
                      onBlur={() => setOldPasswordFocused(false)}
                      placeholder="Enter current password"
                      secureTextEntry={!showOldPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>
                      <MaterialIcons
                        name={showOldPassword ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                  {oldPasswordError ? (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{oldPasswordError}</Text>
                    </View>
                  ) : null}
                </View>

                {/* New Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={[
                    styles.inputWrapper,
                    newPasswordFocused && styles.inputWrapperFocused,
                    passwordError && styles.inputWrapperError
                  ]}>
                    <MaterialIcons 
                      name="lock" 
                      size={20} 
                      color={newPasswordFocused ? colors.primaryButton : '#9ca3af'} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (passwordError) setPasswordError('');
                      }}
                      onFocus={() => setNewPasswordFocused(true)}
                      onBlur={() => setNewPasswordFocused(false)}
                      placeholder="Enter new password"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                      <MaterialIcons
                        name={showNewPassword ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={[
                    styles.inputWrapper,
                    confirmPasswordFocused && styles.inputWrapperFocused,
                    passwordError && styles.inputWrapperError
                  ]}>
                    <MaterialIcons 
                      name="lock" 
                      size={20} 
                      color={confirmPasswordFocused ? colors.primaryButton : '#9ca3af'} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (passwordError) setPasswordError('');
                      }}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      placeholder="Confirm new password"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      <MaterialIcons
                        name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                  {passwordError ? (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{passwordError}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setOldPasswordError('');
                  }}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  onPress={handleChangePassword}
                  style={[
                    styles.modalConfirmButton, 
                    (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim() || loading) && styles.modalConfirmButtonDisabled
                  ]}
                  disabled={!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim() || loading}
                >
                  <Text style={styles.modalConfirmText}>Update</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },

  // Profile Header
  profileHeader: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#64748b',
  },

  // Sections
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionAccount:{
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 12,
  },

  // Setting Cards
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryButton + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#64748b',
  },

  // Logout specific styles
  logoutCard: {
    borderBottomWidth: 0,
  },
  logoutIconContainer: {
    backgroundColor: '#ef444420',
  },
  logoutLabel: {
    color: '#ef4444',
  },

  // Danger Zone styles
  dangerSection: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerHeader: {
    backgroundColor: '#fee2e2',
    borderBottomColor: '#fecaca',
  },
  dangerTitle: {
    color: '#dc2626',
  },
  deleteCard: {
    borderBottomWidth: 0,
    backgroundColor: '#fef2f2',
  },
  deleteIconContainer: {
    backgroundColor: '#dc262620',
  },
  deleteLabel: {
    color: '#dc2626',
    fontWeight: '700',
  },
  deleteValue: {
    color: '#991b1b',
    fontWeight: '500',
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyboard: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  // Input Styles (same as login)
  inputContainer: {
    marginBottom: 20,
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
    backgroundColor: colors.white,
    shadowOpacity: 0.15,
    elevation: 6,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
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
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    backgroundColor: colors.white,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryButton,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: colors.primaryButton + '60',
    shadowOpacity: 0.1,
  },
  modalConfirmText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '700',
  },
});

export default UserProfileScreen;