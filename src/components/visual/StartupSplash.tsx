import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export function StartupSplash({ onLoad }: { onLoad?: () => void }) {
  return <View style={styles.container} accessibilityLabel="Carregando Acervo" accessibilityRole="progressbar">
    <Image source={require('../../../assets/app-icon/splash.png')} resizeMode="contain" style={styles.image} onLoad={onLoad} onError={onLoad} accessible={false} />
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, image: { width: '100%', height: '100%' } });
