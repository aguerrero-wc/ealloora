// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ErrorProvider } from '../contexts/ErrorContext';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Esperar a que termine de cargar

    const inAuthGroup = segments[0] === '(auth)';
    const inPrivateGroup = segments[0] === '(private)';

    console.log('🔄 Navigation check:', {
      isAuthenticated,
      segments,
      inAuthGroup,
      inPrivateGroup,
    });

    if (isAuthenticated && inAuthGroup) {
      // Usuario autenticado en rutas de auth -> redirigir a privadas
      console.log('✅ Redirecting authenticated user to private area');
      router.replace('/(private)/device');
    } else if (!isAuthenticated && inPrivateGroup) {
      // Usuario no autenticado en rutas privadas -> redirigir a login
      console.log('🔒 Redirecting unauthenticated user to login');
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return (
      <LoadingSpinner 
        visible={true} 
        text="Cargando..." 
        color="#007AFF"
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(private)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ErrorProvider>
        <RootLayoutNav />
      </ErrorProvider>
    </AuthProvider>
  );
}