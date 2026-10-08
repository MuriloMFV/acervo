import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

// Keep the sheet under search and the temporary confirmation in one flow.
export const unstable_settings = { initialRouteName: 'index' };

export default function AddLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack>
  );
}
