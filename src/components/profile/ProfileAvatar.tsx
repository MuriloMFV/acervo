import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import UserRound from 'lucide-react-native/icons/user-round';
import { colors, controls, radius, spacing } from '../../theme';

export function ProfileAvatar({ url, busy = false, size = controls.minTouchSize + spacing.xl, style }: {
  url: string | null; busy?: boolean; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  return <View style={[styles.avatar, { width: size, height: size }, style]}>
    {url && !failed
      ? <Image source={{ uri: url }} resizeMode="cover" resizeMethod="resize" style={styles.image} onError={() => setFailed(true)} accessible={false} />
      : <UserRound size={Math.min(controls.iconSize + spacing.md, size * 2 / 3)} color={colors.textSecondary} accessible={false} />}
    {busy && <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});
