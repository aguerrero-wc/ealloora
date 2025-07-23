import React from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface LoadingSpinnerProps {
  visible: boolean;
  text?: string;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible,
  text = 'Cargando...',
  color = '#007AFF',
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default LoadingSpinner;