import { MediaFormatIcon } from '../visual/AssetIcon';
import { StyleSheet } from 'react-native';
import { mediaFormatColors } from '../../theme/media';
import { spacing } from '../../theme';
import type { MediaFormat } from '../../types/collectionPreview';
import { Badge } from '../ui/Badge';

export const mediaFormatLabels: Record<MediaFormat, string> = {
  DVD: 'DVD', BLURAY: 'Blu-ray', UHD_4K: '4K UHD', VHS: 'VHS',
};

export function MediaFormatBadge({ mediaFormat, overlay = false }: { mediaFormat: MediaFormat; overlay?: boolean }) {
  const palette = mediaFormatColors[mediaFormat];
  return (
    <Badge
      hideLabel
      icon={<MediaFormatIcon format={mediaFormat} size={spacing.lg + spacing.xs} color={palette.foreground} />}
      label={mediaFormatLabels[mediaFormat]}
      style={[styles.badge, { backgroundColor: palette.background }, overlay && styles.overlay]}
    />
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  overlay: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
});
