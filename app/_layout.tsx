import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SessionProvider, useSession } from '../src/contexts/SessionContext';
import { CollectionFiltersProvider } from '../src/contexts/CollectionFiltersContext';
import { queryClient } from '../src/lib/queryClient';
import { AppText } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { colors } from '../src/theme';
import { StartupSplash } from '../src/components/visual/StartupSplash';
import { AnimatedStartupSplash } from '../src/components/visual/AnimatedStartupSplash';
import { SuccessFeedbackProvider } from '../src/components/visual/SuccessFeedback';
import { fontAssets } from '../src/theme/fonts';

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.warn('Não foi possível manter a splash screen visível.', error);
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [sessionReady, setSessionReady] = useState(false);
  const [openingComplete, setOpeningComplete] = useState(false);
  const finishOpening = useCallback(() => setOpeningComplete(true), []);
  const hideNativeSplash = useCallback(async () => {
    try { await SplashScreen.hideAsync(); }
    catch (error) { console.warn('Não foi possível ocultar a splash nativa.', error); }
  }, []);

  useEffect(() => {
    if (fontError) {
      SplashScreen.hide();
      // Surface a loading failure rather than leave the splash screen stuck.
      throw fontError;
    }
  }, [fontsLoaded, fontError]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }} accessibilityElementsHidden={!openingComplete} importantForAccessibility={openingComplete ? 'auto' : 'no-hide-descendants'}>
        {fontsLoaded && <QueryClientProvider client={queryClient}>
          <SuccessFeedbackProvider>
            <SessionProvider>
              <SessionReadySignal onReady={setSessionReady} />
              <AppNavigation />
            </SessionProvider>
          </SuccessFeedbackProvider>
        </QueryClientProvider>}
      </View>
      {!openingComplete && <AnimatedStartupSplash ready={fontsLoaded && sessionReady} onPrepared={hideNativeSplash} onFinish={finishOpening} />}
      <StatusBar style="light" />
    </View>
  );
}

function SessionReadySignal({ onReady }: { onReady: (ready: boolean) => void }) {
  const { loading } = useSession();
  useEffect(() => { onReady(!loading); }, [loading, onReady]);
  return null;
}

function AppNavigation() {
  const { session, loading, error, retry } = useSession();
  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => subscription.remove();
  }, []);
  if (loading) return <StartupSplash />;
  if (error) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
    <AppText>Não foi possível restaurar a sessão</AppText><ActionButton label="Tentar novamente" onPress={retry} />
  </View>;
  return <CollectionFiltersProvider key={session?.user.id ?? 'signed-out'}><Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Protected guard={!session}><Stack.Screen name="auth" /></Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="index" />
          <Stack.Screen name="collection/[id]" />
          <Stack.Screen name="collection/edit" />
          <Stack.Screen name="collection/edition-edit" />
          <Stack.Screen name="boxes/[id]" />
          <Stack.Screen name="boxes/edit" />
          <Stack.Screen name="account" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="about" />
          <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' }, gestureEnabled: false }} />
        </Stack.Protected>
      </Stack></CollectionFiltersProvider>;
}
