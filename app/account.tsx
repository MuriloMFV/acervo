import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../src/contexts/SessionContext';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { signOut } from '../src/services/supabase';
import { spacing } from '../src/theme';

export default function AccountScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const exit = async () => {
    setBusy(true); setError(false);
    try { const result = await signOut(); if (result.error) throw result.error; }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  return <Screen><View style={styles.content}>
    <AppText variant="heading">Conta</AppText>
    <AppText>{session?.user.email}</AppText>
    {error && <AppText color="textMuted">Não foi possível sair agora</AppText>}
    <ActionButton label="Sair" busy={busy} onPress={() => void exit()} />
    <ActionButton label="Voltar" secondary disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
  </View></Screen>;
}
const styles = StyleSheet.create({ content: { paddingVertical: spacing.xl, gap: spacing.lg } });
