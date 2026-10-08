import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SessionProvider, useSession } from '../src/contexts/SessionContext';
import { CollectionFiltersProvider } from '../src/contexts/CollectionFiltersContext';
import { queryClient } from '../src/lib/queryClient';
import { AppText } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { colors } from '../src/theme';
import { fontAssets } from '../src/theme/fonts';

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.warn('Não foi possível manter a splash screen visível.', error);
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
    if (fontError) {
      // Surface a loading failure rather than leave the splash screen stuck.
      throw fontError;
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <SessionProvider><AppNavigation /></SessionProvider>
      </QueryClientProvider>
      <StatusBar style="light" />
    </>
  );
}

function AppNavigation() {
  const { session, loading, error, retry } = useSession();
  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => subscription.remove();
  }, []);
  if (loading || error) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
    {loading ? <ActivityIndicator accessibilityLabel="Carregando sessão" color={colors.accent} /> : <><AppText>Não foi possível restaurar a sessão</AppText><ActionButton label="Tentar novamente" onPress={retry} /></>}
  </View>;
  return <CollectionFiltersProvider key={session?.user.id ?? 'signed-out'}><Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Protected guard={!session}><Stack.Screen name="auth" /></Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="index" />
          <Stack.Screen name="collection/[id]" />
          <Stack.Screen name="collection/edit" />
          <Stack.Screen name="account" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' }, gestureEnabled: false }} />
        </Stack.Protected>
      </Stack></CollectionFiltersProvider>;
}
