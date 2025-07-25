// app/(private)/event-watch-family-history.tsx - Modernized Version
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
  primaryButton: '#fe504f',
  primaryText: '#fe504f',
  secondaryText: '#0079BD',
  secondaryDarkText: '#757575',
  valueDarkText: '#333333',
  cardBackground: '#ffffff',
  background: '#f5f5f5',
  success: '#4CAF50',       // Verde para OK
  error: '#d32f2f',         // Rojo para KO
  warning: '#FF9500',
  divider: '#e0e0e0',
  textPrimary: '#333333',
  textSecondary: '#666666',
};

interface EventWatchFamilyParams {
  deviceID?: string;
  deviceName?: string;
  sigfox_id?: string;
  deviceType?: string;
  deviceSettings?: string; // JSON string
}

interface DeviceEvent {
  timestamp: string;
  state: {
    state_name: string;
    state_long_eng?: string;
    state_long_ita?: string;
    state_long_es?: string;
    state_long_fr?: string;
    state_long_sv?: string;
    state_long_fi?: string;
  };
}

interface DeviceSettings {
  l_device_name: string;
}

const EventWatchFamilyHistoryScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { showError } = useErrorContext();

  // Type-safe access to params
  const deviceID = params.deviceID as string | undefined;
  const deviceName = params.deviceName as string | undefined;
  const sigfoxId = params.sigfox_id as string | undefined;
  const deviceType = params.deviceType as string | undefined;
  const deviceSettingsParam = params.deviceSettings as string | undefined;

  // Estados
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DeviceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<keyof Languages>('en');
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings | null>(null);

  // Estados del filtro de fechas
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [fromDateText, setFromDateText] = useState('');
  const [toDateText, setToDateText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');

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

  // Parsear configuraciones del dispositivo
  const parseDeviceSettings = () => {
    if (deviceSettingsParam) {
      try {
        const parsed = JSON.parse(deviceSettingsParam);
        setDeviceSettings(parsed[0] || { l_device_name: deviceName || deviceID || 'Dispositivo' });
      } catch (error) {
        console.error('Error parsing device settings:', error);
        setDeviceSettings({ l_device_name: deviceName || deviceID || 'Dispositivo' });
      }
    } else {
      setDeviceSettings({ l_device_name: deviceName || deviceID || 'Dispositivo' });
    }
  };

  // Obtener historial de eventos
  const getEventHistory = async () => {
    if (!user || !sigfoxId) {
      showError('Faltan datos del dispositivo');
      return;
    }

    try {
      console.log('🔄 Cargando historial de eventos...');
      setLoading(true);

      const token = await user.getIdToken(true);
      
      const response = await fetch(
        `${api.endpoint}watchfamily?scope=device&id_sigfox=${sigfoxId}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();

      if (responseJson.status_code === 400) {
        throw new Error(responseJson.message || 'Error del servidor');
      }

      // console.log('✅ Historial cargado:', responseJson);
      setEvents(responseJson || []);
      setFilteredEvents(responseJson || []);

    } catch (error: any) {
      console.error('❌ Error cargando historial:', error);
      showError(error.message || 'Error cargando historial de eventos');
    } finally {
      setLoading(false);
    }
  };

  // Obtener imagen del dispositivo
  const getDeviceImage = (type?: string) => {
    // Puedes crear diferentes imágenes según el tipo
    switch (type) {
      case 'watch':
        return require('../../assets/slide/volt-history.png'); // Cambiar por imagen real
      case 'xsafe':
        return require('../../assets/slide/volt-history.png'); // Cambiar por imagen real
      default:
        return require('../../assets/slide/volt-history.png'); // Cambiar por imagen real
    }
  };

  // Formatear fecha
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatear hora
  const formatTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Formatear día
  const formatDay = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // Obtener estado localizado con estilo
  const getLocalizedStateWithStyle = (state: DeviceEvent['state']): { text: string; style: any } => {
    if (!state) return { text: '-', style: styles.cellText };

    let stateText = '';
    switch (lang) {
      case 'en':
        stateText = state.state_long_eng || state.state_name || '-';
        break;
      case 'it':
        stateText = state.state_long_ita || state.state_name || '-';
        break;
      case 'es':
        stateText = state.state_long_es || state.state_name || '-';
        break;
      case 'fr':
        stateText = state.state_long_fr || state.state_name || '-';
        break;
      case 'sv':
        stateText = state.state_long_sv || state.state_name || '-';
        break;
      case 'fi':
        stateText = state.state_long_fi || state.state_name || '-';
        break;
      default:
        stateText = state.state_name || '-';
    }

    // Aplicar estilos según el estado
    const upperState = stateText.toUpperCase();
    if (upperState === 'OK' || upperState === 'NORMAL' || upperState === 'ARMED') {
      return { text: stateText, style: styles.stateOK };
    } else if (upperState === 'KO' || upperState === 'ERROR' || upperState === 'ALARM' || upperState === 'ALARMA') {
      return { text: stateText, style: styles.stateKO };
    }

    return { text: stateText, style: styles.cellText };
  };

  // Abrir selector de fechas
  const openDatePicker = (mode: 'from' | 'to') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  // Manejar selección de fecha
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      if (datePickerMode === 'from') {
        setFromDate(selectedDate);
        setFromDateText(formatDate(selectedDate));
      } else {
        setToDate(selectedDate);
        setToDateText(formatDate(selectedDate));
      }
    }
  };

  // Aplicar filtro de fechas
  const applyDateFilter = () => {
    let filtered = [...events];

    if (fromDate || toDate) {
      filtered = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        
        let matchesFrom = true;
        let matchesTo = true;

        if (fromDate) {
          matchesFrom = eventDate >= fromDate;
        }

        if (toDate) {
          // Agregar un día para incluir eventos del día "hasta"
          const toDateEnd = new Date(toDate);
          toDateEnd.setDate(toDateEnd.getDate() + 1);
          matchesTo = eventDate <= toDateEnd;
        }

        return matchesFrom && matchesTo;
      });
    }

    setFilteredEvents(filtered);
    setShowDateFilter(false);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
    setFromDateText('');
    setToDateText('');
    setFilteredEvents(events);
    setShowDateFilter(false);
  };

  // Navegación hacia atrás
  const handleGoBack = () => {
    router.back();
  };

  // Renderizar elemento de la lista
  const renderEventItem = ({ item }: { item: DeviceEvent }) => {
    const stateInfo = getLocalizedStateWithStyle(item.state);
    
    return (
      <View style={styles.eventRow}>
        <View style={styles.eventCell}>
          <Text style={styles.cellText}>{formatDay(item.timestamp)}</Text>
        </View>
        <View style={styles.eventCell}>
          <Text style={[styles.cellText, styles.centerText]}>{formatTime(item.timestamp)}</Text>
        </View>
        <View style={styles.eventCell}>
          <Text style={[stateInfo.style, styles.rightText]}>{stateInfo.text}</Text>
        </View>
      </View>
    );
  };

  // Separador de elementos
  const renderSeparator = () => <View style={styles.separator} />;

  // Renderizar vista vacía
  const renderEmptyView = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-note" size={64} color={colors.secondaryDarkText} />
      <Text style={styles.emptyTitle}>Sin eventos</Text>
      <Text style={styles.emptySubtitle}>
        No hay eventos registrados para este dispositivo en el período seleccionado.
      </Text>
    </View>
  );

  // Effects
  useEffect(() => {
    setupLanguage();
    parseDeviceSettings();
  }, []);

  useEffect(() => {
    if (user && sigfoxId) {
      getEventHistory();
    }
  }, [user, sigfoxId]);

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} text="Loading history..." />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryButton} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {deviceSettings?.l_device_name || deviceName || 'Device'}
        </Text>
        <Pressable onPress={() => setShowDateFilter(true)} style={styles.filterButton}>
          <MaterialIcons name="filter-list" size={24} color={colors.primaryButton} />
        </Pressable>
      </View>

      {/* Device Image */}
      <Image
        style={styles.deviceImage}
        source={getDeviceImage(deviceType)}
        resizeMode="contain"
      />

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.headerCell}>
          <Text style={styles.headerCellText}>{t('date', lang)}</Text>
        </View>
        <View style={styles.headerCell}>
          <Text style={[styles.headerCellText, styles.centerText]}>{t('time', lang)}</Text>
        </View>
        <View style={styles.headerCell}>
          <Text style={[styles.headerCellText, styles.rightText]}>{t('state', lang)}</Text>
        </View>
      </View>

      {/* Events List */}
      <View style={styles.listContainer}>
        {filteredEvents.length > 0 ? (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            ItemSeparatorComponent={renderSeparator}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          !loading && renderEmptyView()
        )}
      </View>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('filter_date', lang)}</Text>
              <Pressable onPress={() => setShowDateFilter(false)}>
                <MaterialIcons name="close" size={24} color={colors.secondaryDarkText} />
              </Pressable>
            </View>

            {/* From Date */}
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>{t('from_day', lang)}</Text>
              <Pressable style={styles.dateInput} onPress={() => openDatePicker('from')}>
                <Text style={styles.dateInputText}>
                  {fromDateText || 'Seleccionar fecha'}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color={colors.primaryButton} />
              </Pressable>
            </View>

            {/* To Date */}
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>{t('to_day', lang)}</Text>
              <Pressable style={styles.dateInput} onPress={() => openDatePicker('to')}>
                <Text style={styles.dateInputText}>
                  {toDateText || 'Seleccionar fecha'}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color={colors.primaryButton} />
              </Pressable>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </Pressable>
              <Pressable style={styles.applyButton} onPress={applyDateFilter}>
                <Text style={styles.applyButtonText}>{t('save', lang).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'from' ? (fromDate || new Date()) : (toDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

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
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  filterButton: {
    padding: 8,
  },
  deviceImage: {
    width: '100%',
    height: 203,
    // backgroundColor: colors.background,
    backgroundColor: '#EEEEEE',
  },
  tableHeader: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: 20, // Aumentado padding horizontal
  },
  headerCell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4, // Consistente con eventRow
  },
  headerCellText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  centerText: {
    textAlign: 'center',
  },
  rightText: {
    textAlign: 'right',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20, // Aumentado padding horizontal
  },
  eventRow: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    paddingHorizontal: 4, // Pequeño padding interno para mejor visualización
  },
  eventCell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4, // Consistente con headerCell
  },
  cellText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  stateOK: {
    fontSize: 14,
    color: colors.success,
    fontWeight: 'bold',
  },
  stateKO: {
    fontSize: 14,
    color: colors.error,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondaryDarkText,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  dateInputText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 16,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primaryButton,
  },
  applyButtonText: {
    fontSize: 14,
    color: colors.cardBackground,
    fontWeight: 'bold',
  },
});

export default EventWatchFamilyHistoryScreen;