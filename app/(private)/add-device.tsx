// app/(private)/add-device.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const AddDeviceScreen: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 Agregar Dispositivo</Text>
      <Text style={styles.subtitle}>Aquí puedes agregar un nuevo dispositivo</Text>
      
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Esta es una pantalla temporal para probar la navegación
        </Text>
      </View>

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>VOLVER</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  placeholder: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    marginBottom: 32,
    minWidth: '80%',
  },
  placeholderText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: '60%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddDeviceScreen;