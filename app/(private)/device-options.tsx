// app/(private)/device-options.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';
import PrivateHeader from '../../components/PrivateHeader';

// Constants
import api from '../../constants/api';
import colors from '../../constants/Colors';

// Contexts
import { useAuth } from '../../contexts/AuthContext';
import { useErrorContext } from '../../contexts/ErrorContext';

// Placeholder para imágenes de dispositivos
const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'termo':
      return require('../../assets/slide/volt.png');
    case 'watch':
      return require('../../assets/slide/watch.png');
    default:
      return require('../../assets/slide/volt.png');
  }
};

const DeviceOptionsScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { showError } = useErrorContext();

  // Parámetros del dispositivo
  const deviceID = params.deviceID as string;
  const deviceName = params.deviceName as string;
  const sigfox_id = params.sigfox_id as string;
  const deviceType = params.deviceType as string;
  const settingId = params.settingId as string;

  // Estados principales
  const [loading, setLoading] = useState(false);
  const [currentDeviceName, setCurrentDeviceName] = useState(deviceName); // Estado local para el nombre

  // Estados para modales
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Estados para formulario de nombre
  const [newDeviceName, setNewDeviceName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  // Función para cambiar el nombre del dispositivo
  const handleChangeName = async () => {
    if (!newDeviceName.trim()) {
      setNameError('Device name is required');
      return;
    }

    if (!user || !settingId) {
      showError('Missing authentication or device data');
      return;
    }

    try {
      setLoading(true);
      setNameError('');

      // Obtener token del usuario
      const accessToken = await user.getIdToken(true);

      // Llamada a la API para cambiar nombre
      const response = await fetch(`${api.endpoint}setting/${settingId}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          l_device_name: newDeviceName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();

      if (responseJson.status_code >= 400) {
        throw new Error(responseJson.message || 'Server error');
      }

      console.log('✅ Device name updated:', responseJson);
      
      // Actualizar el nombre local inmediatamente
      setCurrentDeviceName(newDeviceName.trim());
      
      setNameModalVisible(false);
      setNewDeviceName('');
      
      Alert.alert(
        'Success',
        'Device name updated successfully',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('❌ Error updating device name:', error);
      setNameError(error.message || 'Failed to update device name');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar el dispositivo
  const handleDeleteDevice = async () => {
    if (!user || !sigfox_id) {
      showError('Missing authentication or device data');
      return;
    }

    try {
      setLoading(true);

      // Obtener token del usuario
      const accessToken = await user.getIdToken(true);

      // Llamada a la API para disociar/eliminar dispositivo
      const response = await fetch(`${api.endpoint}device/${deviceID}?action=dissociate`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: currentDeviceName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();

      if (responseJson.status_code >= 400) {
        throw new Error(responseJson.message || 'Server error');
      }

      console.log('✅ Device removed successfully:', responseJson);
      
      setDeleteModalVisible(false);
      
      Alert.alert(
        'Success',
        'Device removed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navegar de vuelta a la lista de dispositivos
              router.replace('/(private)/device');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Error removing device:', error);
      setLoading(false);
      
      Alert.alert(
        'Error',
        error.message || 'Failed to remove device. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Confirmar eliminación del dispositivo
  const confirmDeleteDevice = () => {
    Alert.alert(
      '⚠️ Remove Device',
      `Are you sure you want to remove "${currentDeviceName}" from your account? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Device',
          style: 'destructive',
          onPress: handleDeleteDevice,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Processing..." />

      {/* Header */}
      <PrivateHeader 
        title="Device Options"
        showBack={true}
        showProfile={true}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Device Header */}
        <View style={styles.deviceHeader}>
          <View style={styles.deviceImageContainer}>
            <Image
              style={styles.deviceImage}
              source={getDeviceIcon(deviceType)}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.deviceName}>{currentDeviceName}</Text>
          <Text style={styles.deviceId}>ID: {deviceID}</Text>
          <Text style={styles.deviceType}>
            {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
          </Text>
        </View>

        {/* Options Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={24} color={colors.primaryButton} />
            <Text style={styles.sectionTitle}>Device Settings</Text>
          </View>

          {/* Change Name Option */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => {
              setNewDeviceName(currentDeviceName);
              setNameModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <MaterialIcons name="edit" size={20} color={colors.primaryButton} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Change Name</Text>
              <Text style={styles.optionValue}>Update device display name</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <View style={[styles.sectionHeader, styles.dangerHeader]}>
            <MaterialIcons name="warning" size={24} color="#dc2626" />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          </View>

          {/* Remove Device Option */}
          <TouchableOpacity 
            style={[styles.optionCard, styles.dangerCard]}
            onPress={confirmDeleteDevice}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIconContainer, styles.dangerIconContainer]}>
              <MaterialIcons name="delete-forever" size={20} color="#dc2626" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, styles.dangerLabel]}>Remove Device</Text>
              <Text style={[styles.optionValue, styles.dangerValue]}>
                Disconnect device from your account
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Name Modal */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="edit" size={32} color={colors.primaryButton} />
                </View>
                <Text style={styles.modalTitle}>Change Device Name</Text>
                <Text style={styles.modalSubtitle}>
                  Enter a new display name for your device
                </Text>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Device Name</Text>
                  <View style={[
                    styles.inputWrapper,
                    nameFocused && styles.inputWrapperFocused,
                    nameError && styles.inputWrapperError
                  ]}>
                    <MaterialIcons 
                      name="devices" 
                      size={20} 
                      color={nameFocused ? colors.primaryButton : '#9ca3af'} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={newDeviceName}
                      onChangeText={(text) => {
                        setNewDeviceName(text);
                        if (nameError) setNameError('');
                      }}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      placeholder="Enter device name"
                      autoCapitalize="words"
                      autoCorrect={false}
                      maxLength={50}
                    />
                  </View>
                  {nameError ? (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{nameError}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  onPress={() => {
                    setNameModalVisible(false);
                    setNewDeviceName('');
                    setNameError('');
                  }}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  onPress={handleChangeName}
                  style={[
                    styles.modalConfirmButton, 
                    (!newDeviceName.trim() || loading) && styles.modalConfirmButtonDisabled
                  ]}
                  disabled={!newDeviceName.trim() || loading}
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

  // Device Header
  deviceHeader: {
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
  deviceImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  deviceImage: {
    width: 48,
    height: 48,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  deviceId: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 12,
    color: colors.primaryButton,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
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

  // Option Cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryButton + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 14,
    color: '#64748b',
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
  dangerCard: {
    borderBottomWidth: 0,
    backgroundColor: '#fef2f2',
  },
  dangerIconContainer: {
    backgroundColor: '#dc262620',
  },
  dangerLabel: {
    color: '#dc2626',
    fontWeight: '700',
  },
  dangerValue: {
    color: '#991b1b',
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

  // Input Styles
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

export default DeviceOptionsScreen;