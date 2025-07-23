import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function RegistrationScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text>Pantalla de registro aquí</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // puedes cambiar esto según tu tema
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center', // o 'flex-start' si prefieres que empiece arriba
    alignItems: 'center',
  },
});
