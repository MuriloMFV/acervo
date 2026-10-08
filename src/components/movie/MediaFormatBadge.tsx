import { StyleSheet } from 'react-native';
import { mediaFormatColors } from '../../theme/media';
import { spacing, typography } from '../../theme';
import type { MediaFormat } from '../../types/collectionPreview';
import { Badge } from '../ui/Badge';

export const mediaFormatLabels: Record<MediaFormat, string> = {
  DVD: 'DVD', BLURAY: 'Blu-ray', UHD_4K: '4K UHD', VHS: 'VHS',
};

export function MediaFormatBadge({ mediaFormat }: { mediaFormat: MediaFormat }) {
  const palette = mediaFormatColors[mediaFormat];
  return (
    <Badge
      label={mediaFormatLabels[mediaFormat]}
      style={[styles.badge, { backgroundColor: palette.background }]}
      textStyle={[typography.mediaBadge, { color: palette.foreground }]}
    />
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
});
