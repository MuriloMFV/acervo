import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { VideoStandardIcon } from '../visual/VideoStandardIcon';
import type { VideoStandard } from '../../types/videoStandard';

export function VideoStandardDisplay({ value }: { value: VideoStandard | null | undefined }) {
  return <View style={styles.row} accessible={!!value} accessibilityRole={value ? 'image' : undefined} accessibilityLabel={value ? `Codificação: ${value}` : undefined}>
    {value ? <VideoStandardIcon value={value} /> : <AppText variant="label">—</AppText>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
