import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Search from 'lucide-react-native/icons/search';
import ScanBarcode from 'lucide-react-native/icons/scan-barcode';
import Images from 'lucide-react-native/icons/images';
import { AppText, IconButton, Screen } from '../src/components/ui';
import { AssetIcon, MediaFormatIcon } from '../src/components/visual/AssetIcon';
import { mediaFormatLabels } from '../src/components/movie/MediaFormatBadge';
import type { MediaFormat } from '../src/types/collectionPreview';
import { colors, controls, radius, spacing } from '../src/theme';
import appConfig from '../app.json';

const formats: MediaFormat[] = ['DVD', 'BLURAY', 'UHD_4K', 'VHS'];
const iconProps = { size: controls.iconSize, color: colors.accent };

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <View style={styles.feature}>
    <View style={styles.featureIcon}>{icon}</View>
    <View style={styles.featureText}>
      <AppText variant="label">{title}</AppText>
      <AppText variant="caption" color="textSecondary">{text}</AppText>
    </View>
  </View>;
}

export default function AboutScreen() {
  const router = useRouter();
  const version = appConfig.expo.version;
  return <Screen>
    <View style={styles.header}>
      <IconButton accessibilityLabel="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')}>
        <ArrowLeft size={controls.iconSize} color={colors.text} />
      </IconButton>
      <AppText variant="heading" style={styles.headerTitle}>Sobre o Acervo</AppText>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identity}>
        <View style={styles.brandIcon}><AssetIcon name="dvd-case" size={spacing.xl * 2} /></View>
        <AppText variant="title" color="accent">Acervo</AppText>
        <AppText color="textSecondary" style={styles.centered}>Seu catálogo de mídia física.</AppText>
        <View style={styles.formats}>
          {formats.map(format => <View key={format} style={styles.format} accessible accessibilityLabel={mediaFormatLabels[format]}>
            <MediaFormatIcon format={format} />
          </View>)}
        </View>
      </View>
      <AppText color="textSecondary" style={styles.centered}>Projeto de estudos criado por um colecionador de mídia física, sem fins comerciais.</AppText>
      <View style={styles.features}>
        <Feature icon={<Search {...iconProps} />} title="Encontre filmes" text="Busque títulos e informações no TMDB." />
        <Feature icon={<ScanBarcode {...iconProps} />} title="Identifique sua edição" text="Leia o código de barras. Sem resultado? UPCitemdb e SerpApi ajudam na busca." />
        <Feature icon={<Images {...iconProps} />} title="A capa da sua edição" text="Encontre e escolha a capa certa da sua mídia física." />
        <Feature icon={<AssetIcon name="archive" />} title="Sua coleção, do seu jeito" text="Organize seus filmes com favoritos, filtros e estatísticas." />
      </View>
      <AppText variant="caption" color="textMuted" style={styles.centered}>Versão {version} (beta)</AppText>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  headerTitle: { flex: 1 },
  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  brandIcon: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accentSurface },
  centered: { textAlign: 'center' },
  formats: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  format: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  features: { gap: spacing.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  featureIcon: { width: controls.minTouchSize, height: controls.minTouchSize, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accentSurface },
  featureText: { flex: 1, gap: spacing.xs },
});
