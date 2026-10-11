import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import Mail from 'lucide-react-native/icons/mail';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { FormField } from '../src/components/ui/FormField';
import { signIn, signUp } from '../src/services/supabase';
import { colors, controls, radius, spacing, typography } from '../src/theme';

const shelf = require('../assets/Prateleira Cinematográfica com Filmes Icônicos.png');
const logo = require('../assets/logo/acervo.png');
const shelfAspectRatio = 1672 / 941;

function LoginField({ label, kind, ...props }: TextInputProps & { label: string; kind: 'email' | 'password' }) {
  return <View style={styles.field}>
    <View style={styles.fieldHeading}>
      <AppText variant="label">{label}</AppText>
      {kind === 'password' && <AppText variant="caption" color="accent" style={styles.forgot}>Esqueceu a senha?</AppText>}
    </View>
    <View style={styles.inputContainer}>
      {kind === 'email'
        ? <Mail accessible={false} size={controls.iconSize - spacing.xs} color={colors.textMuted} />
        : <LockKeyhole accessible={false} size={controls.iconSize - spacing.xs} color={colors.textMuted} />}
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.textMuted} selectionColor={colors.accent} {...props} style={styles.input} />
    </View>
  </View>;
}

export default function AuthScreen() {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.max(0, width - spacing.page * 2);
  const shelfHeight = Math.min(height * 0.22, spacing.xl * 6, contentWidth / shelfAspectRatio);
  const logoWidth = Math.min(contentWidth * 0.76, spacing.xl * 8);
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
  const isLogin = mode === 'signin';
  const passwordAutocomplete = mode === 'signin' ? 'current-password' : 'new-password';
  const buttons = <>
    <ActionButton label={mode === 'signin' ? 'Entrar' : 'Criar conta'} onPress={() => void submit()} busy={busy} style={isLogin ? styles.primaryButton : undefined} labelStyle={isLogin ? styles.buttonLabel : undefined} />
    <ActionButton label={mode === 'signin' ? 'Criar conta' : 'Já tenho conta'} secondary disabled={busy} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }} style={isLogin ? styles.secondaryButton : undefined} labelStyle={isLogin ? styles.buttonLabel : undefined} />
  </>;
  const form = <>
    <AppText variant="heading">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</AppText>
    {isLogin ? <View style={styles.fields}>
      <LoginField label="E-mail" kind="email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} placeholder="seu@email.com" />
      <LoginField label="Senha" kind="password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={passwordAutocomplete} editable={!busy} placeholder="••••••••" />
    </View> : <>
      <FormField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} />
      <FormField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={passwordAutocomplete} editable={!busy} />
    </>}
    {!!message && <AppText accessibilityRole="alert" color="textSecondary">{message}</AppText>}
    {isLogin ? <View style={styles.actions}>{buttons}</View> : buttons}
  </>;
  return <Screen>
    {isLogin && <Svg accessible={false} pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id="loginLight" cx="70%" cy="9%" rx="85%" ry="44%">
        <Stop offset="0" stopColor={colors.primary} stopOpacity={0.11} />
        <Stop offset="0.55" stopColor={colors.primary} stopOpacity={0.035} />
        <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
      </RadialGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#loginLight)" />
    </Svg>}
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={!isLogin} contentContainerStyle={isLogin ? styles.loginContent : styles.content}>
        {isLogin ? <View style={styles.hero}>
          <Image accessible={false} source={shelf} resizeMode="contain" resizeMethod="resize" style={{ width: shelfHeight * shelfAspectRatio, height: shelfHeight }} />
          <Image accessibilityLabel="Acervo" source={logo} resizeMode="contain" resizeMethod="resize" style={{ width: logoWidth, height: logoWidth / 3 }} />
        </View> : <AppText variant="title">Acervo</AppText>}
        {isLogin ? <View style={styles.loginForm}>{form}</View> : form}
        {isLogin && <AppText variant="caption" color="textMuted" style={styles.version}>versão 1.0.1 (beta)</AppText>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.lg },
  loginContent: { flexGrow: 1, alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xl },
  hero: { width: '100%', maxWidth: spacing.xl * 16, alignItems: 'center', gap: spacing.md },
  loginForm: { width: '100%', maxWidth: spacing.xl * 14, gap: spacing.lg },
  fields: { gap: spacing.md },
  field: { gap: spacing.sm },
  fieldHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  forgot: { marginLeft: 'auto' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceElevated },
  input: { ...typography.body, flex: 1, minWidth: 0, minHeight: controls.minTouchSize + spacing.sm, color: colors.text, paddingVertical: spacing.md },
  actions: { gap: spacing.sm },
  primaryButton: { minHeight: spacing.xl + spacing.lg, borderRadius: radius.lg, shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: spacing.md, shadowOffset: { width: 0, height: spacing.xs } },
  secondaryButton: { minHeight: spacing.xl + spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  buttonLabel: { fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight },
  version: { marginTop: 'auto', paddingTop: spacing.md, textAlign: 'center' },
});
