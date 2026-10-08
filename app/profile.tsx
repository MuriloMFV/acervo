import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { BottomNavigation } from '../src/components/collection/BottomNavigation';
import { ProfileHeader } from '../src/components/profile/ProfileHeader';
import { CollectionStatistics } from '../src/components/profile/CollectionStatistics';
import { ProfileLinks } from '../src/components/profile/ProfileLinks';
import { useCollection } from '../src/hooks/useCollection';
import { useProfile } from '../src/hooks/useProfile';
import { useCollectionFilters } from '../src/contexts/CollectionFiltersContext';
import { calculateCollectionStats } from '../src/utils/collectionStats';
import type { CollectionShortcut } from '../src/types/collectionFilters';
import { colors, spacing } from '../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const collection = useCollection();
  const profile = useProfile();
  const { applyShortcut } = useCollectionFilters();
  const stats = useMemo(() => collection.data ? calculateCollectionStats(collection.data) : null, [collection.data]);
  const openCollection = () => router.dismissTo('/');
  const openAccount = () => router.navigate('/account');
  const openShortcut = (shortcut: CollectionShortcut) => { applyShortcut(shortcut); openCollection(); };
  return <Screen edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ProfileHeader profile={profile.data ?? null} count={stats?.total ?? null} onCollectionPress={openCollection} onAccountPress={openAccount} />
      {profile.isPending && <ActivityIndicator accessibilityLabel="Carregando perfil" color={colors.accent} />}
      {profile.isError && <View style={styles.error}><AppText color="textMuted">Não foi possível carregar o perfil</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void profile.refetch(); }} /></View>}
      {collection.isPending && <ActivityIndicator accessibilityLabel="Carregando estatísticas" color={colors.accent} />}
      {collection.isError && <View style={styles.error}><AppText color="textMuted">Não foi possível carregar as estatísticas</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void collection.refetch(); }} /></View>}
      {stats && <CollectionStatistics stats={stats} />}
      <ProfileLinks stats={stats} onShortcut={openShortcut} onAccount={openAccount} />
    </ScrollView>
    <BottomNavigation active="profile" count={stats?.total ?? 0} onCollectionPress={openCollection} onAddPress={() => router.navigate('/add')} onProfilePress={() => {}} />
  </Screen>;
}
const styles = StyleSheet.create({ screen: { paddingHorizontal: 0 }, content: { paddingHorizontal: spacing.page, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.xl }, error: { gap: spacing.md } });
