import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { FormField } from '../src/components/ui/FormField';
import { signIn, signUp } from '../src/services/supabase';
import { spacing } from '../src/theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (!email.trim() || !password) { setMessage('Informe e-mail e senha.'); return; }
    setBusy(true); setMessage('');
    try {
      const { data, error } = await (mode === 'signin' ? signIn(email, password) : signUp(email, password));
      if (error) {
        setMessage(error.code === 'email_not_confirmed' ? 'Confirme seu e-mail antes de entrar.' : error.code === 'invalid_credentials' ? 'E-mail ou senha inválidos.' : 'Não foi possível continuar. Verifique os dados.');
      } else if (mode === 'signup' && !data.session) {
        setMessage('Confirme seu e-mail para entrar.');
        setMode('signin'); setPassword('');
      }
    } catch { setMessage('Não foi possível conectar agora.'); }
    finally { setBusy(false); }
  };
  return <Screen>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <AppText variant="title">Acervo</AppText>
        <AppText variant="heading">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</AppText>
        <FormField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} />
        <FormField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} editable={!busy} />
        {!!message && <AppText accessibilityRole="alert" color="textSecondary">{message}</AppText>}
        <ActionButton label={mode === 'signin' ? 'Entrar' : 'Criar conta'} onPress={() => void submit()} busy={busy} />
        <ActionButton label={mode === 'signin' ? 'Criar conta' : 'Já tenho conta'} secondary disabled={busy} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }} />
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.lg } });
