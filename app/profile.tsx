import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { BottomNavigation } from '../src/components/collection/BottomNavigation';
import { ProfileHeader } from '../src/components/profile/ProfileHeader';
import { CollectionStatistics } from '../src/components/profile/CollectionStatistics';
import { ProfileLinks } from '../src/components/profile/ProfileLinks';
import { useCollection } from '../src/hooks/useCollection';
import { useCollectionBoxes } from '../src/hooks/useCollectionBoxes';
import { useProfile } from '../src/hooks/useProfile';
import { useProfilePhoto } from '../src/hooks/useProfilePhoto';
import { profileDisplayName } from '../src/services/profile/identity';
import { useCollectionFilters } from '../src/contexts/CollectionFiltersContext';
import { calculateCollectionStats } from '../src/utils/collectionStats';
import type { CollectionShortcut } from '../src/types/collectionFilters';
import { colors, spacing } from '../src/theme';
import { useSession } from '../src/contexts/SessionContext';
import { exportCollectionPdf } from '../src/services/export';
import { exportDiagnostic, exportErrorMessage } from '../src/services/export/errors';

export default function ProfileScreen() {
  const router = useRouter();
  const collection = useCollection();
  const boxes = useCollectionBoxes();
  const profile = useProfile();
  const { session } = useSession();
  const photo = useProfilePhoto(profile.data ?? null);
  const exportLock = useRef(false);
  const [exporting, setExporting] = useState(false);
  const exportAcervo = async () => {
    if (exportLock.current || !session) return;
    exportLock.current = true;
    setExporting(true);
    try { await exportCollectionPdf(session.user.id); }
    catch (cause) {
      if (__DEV__) console.warn('[Acervo PDF] Exportação falhou', exportDiagnostic(cause));
      Alert.alert('Exportar Acervo', exportErrorMessage(cause));
    }
    finally { exportLock.current = false; setExporting(false); }
  };
  const { applyShortcut } = useCollectionFilters();
  const stats = useMemo(() => collection.data && boxes.data && !collection.isError && !boxes.isError
    ? calculateCollectionStats(collection.data, boxes.data) : null, [collection.data, boxes.data, collection.isError, boxes.isError]);
  const openCollection = () => router.dismissTo('/');
  const openAccount = () => router.navigate('/account');
  const openShortcut = (shortcut: CollectionShortcut) => { applyShortcut(shortcut); openCollection(); };
  return <Screen edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ProfileHeader profile={profile.data ?? null} displayName={profileDisplayName(profile.data?.display_name, session?.user)} photoUrl={photo.url} photoBusy={photo.busy} photoLoading={photo.loading} onPhotoPress={photo.choose} onCollectionPress={openCollection} onAccountPress={openAccount} />
      {!!photo.error && <View style={styles.error}><AppText accessibilityRole="alert" color="textMuted">{photo.error}</AppText><ActionButton secondary label="Tentar novamente" disabled={photo.busy} onPress={photo.retry} /></View>}
      {profile.isPending && <ActivityIndicator accessibilityLabel="Carregando perfil" color={colors.accent} />}
      {profile.isError && <View style={styles.error}><AppText color="textMuted">Não foi possível carregar o perfil</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void profile.refetch(); }} /></View>}
      {(collection.isPending || boxes.isPending) && <ActivityIndicator accessibilityLabel="Carregando estatísticas" color={colors.accent} />}
      {(collection.isError || boxes.isError) && <View style={styles.error}><AppText color="textMuted">Não foi possível carregar as estatísticas</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void Promise.all([collection.refetch(), boxes.refetch()]); }} /></View>}
      {stats && <CollectionStatistics stats={stats} />}
      <ProfileLinks stats={stats} onShortcut={openShortcut} onAccount={openAccount} onAbout={() => router.navigate('/about')} onExport={() => { void exportAcervo(); }} exporting={exporting} onWishlist={() => router.navigate('/wishlist')} />
    </ScrollView>
    <BottomNavigation active="profile" count={stats?.total ?? 0} onCollectionPress={openCollection} onAddPress={() => router.navigate('/add')} onProfilePress={() => {}} />
  </Screen>;
}
const styles = StyleSheet.create({ screen: { paddingHorizontal: 0 }, content: { paddingHorizontal: spacing.page, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.xl }, error: { gap: spacing.md } });
