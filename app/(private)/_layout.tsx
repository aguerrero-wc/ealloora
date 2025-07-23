// app/(private)/_layout.tsx
import { Stack } from 'expo-router';

export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="device" />
      <Stack.Screen name="add-device" />
    </Stack>
  );
}