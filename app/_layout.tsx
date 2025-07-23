// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ErrorProvider } from '../contexts/ErrorContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';

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

    // 🎯 CASO 1: Primera carga de la app (segments vacío)
    if (segments.length === 0) {
      if (isAuthenticated) {
        console.log('✅ First load: authenticated user → private area');
        router.replace('/(private)/device');
      } else {
        console.log('🔒 First load: unauthenticated user → login');
        router.replace('/(auth)/login');
      }
      return;
    }

    // 🎯 CASO 2: Usuario autenticado en rutas de auth
    if (isAuthenticated && inAuthGroup) {
      console.log('✅ Redirecting authenticated user to private area');
      router.replace('/(private)/device');
    } 
    // 🎯 CASO 3: Usuario no autenticado en rutas privadas  
    else if (!isAuthenticated && inPrivateGroup) {
      console.log('🔒 Redirecting unauthenticated user to login');
      router.replace('/(auth)/login');
    }
    // 🎯 CASO 4: Usuario no autenticado fuera de grupos auth
    else if (!isAuthenticated && !inAuthGroup && !inPrivateGroup) {
      console.log('🔒 User outside auth group → redirecting to login');
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
        <NotificationsProvider>
          <RootLayoutNav />
        </NotificationsProvider>
      </ErrorProvider>
    </AuthProvider>
  );
}