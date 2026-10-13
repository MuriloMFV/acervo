import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../src/contexts/SessionContext';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { FormField } from '../src/components/ui/FormField';
import { useProfile } from '../src/hooks/useProfile';
import { queryKeys } from '../src/lib/queryClient';
import { profileDisplayName } from '../src/services/profile/identity';
import { updateProfileName } from '../src/services/supabase/profile';
import { signOut } from '../src/services/supabase';
import { spacing } from '../src/theme';

export default function AccountScreen() {
  const { session } = useSession();
  const router = useRouter();
  const profile = useProfile();
  const client = useQueryClient();
  const userId = session?.user.id ?? '';
  const [name, setName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const nameLock = useRef(false);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  useEffect(() => {
    if (!dirty) setName(profileDisplayName(profile.data?.display_name, session?.user));
  }, [profile.data?.display_name, session?.user, dirty]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const exit = async () => {
    if (busy || nameLock.current) return;
    setBusy(true); setError(false);
    try { const result = await signOut(); if (result.error) throw result.error; }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  const saveName = async () => {
    if (nameLock.current || busy || !userId) return;
    nameLock.current = true; setSaving(true); setNameMessage('');
    try {
      const saved = await updateProfileName(userId, name);
      if (currentUserId.current === userId) {
        client.setQueryData(queryKeys.profile(userId), saved);
        setName(saved.display_name); setDirty(false); setNameMessage('Nome atualizado.');
      }
    } catch (cause) {
      if (currentUserId.current === userId) setNameMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar o nome.');
    } finally { nameLock.current = false; setSaving(false); }
  };
  return <Screen><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
    <AppText variant="heading">Conta</AppText>
    <AppText>{session?.user.email}</AppText>
    <FormField label="Nome" value={name} maxLength={80} autoComplete="name" editable={!busy && !saving && !!profile.data} onChangeText={value => { setName(value); setDirty(true); setNameMessage(''); }} />
    {!!nameMessage && <AppText accessibilityRole="alert" color="textSecondary">{nameMessage}</AppText>}
    {profile.isError && <ActionButton secondary label="Carregar dados da conta" onPress={() => { void profile.refetch(); }} />}
    <ActionButton label="Salvar nome" secondary busy={saving} disabled={busy || !profile.data || !dirty} onPress={() => { void saveName(); }} />
    {error && <AppText color="textMuted">Não foi possível sair agora</AppText>}
    <ActionButton label="Sair" busy={busy} disabled={saving} onPress={() => void exit()} />
    <ActionButton label="Voltar" secondary disabled={busy || saving} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
  </ScrollView></KeyboardAvoidingView></Screen>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, content: { paddingVertical: spacing.md, paddingBottom: spacing.xl, gap: spacing.md } });
