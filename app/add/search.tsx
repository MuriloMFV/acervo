import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { VisualFeedback } from '../../src/components/visual/VisualFeedback';
import { MovieSearchField } from '../../src/components/add/MovieSearchField';
import { MovieSearchResult } from '../../src/components/add/MovieSearchResult';
import { AppText, IconButton, Screen } from '../../src/components/ui';
import { useMovieSearch } from '../../src/hooks/useMovieSearch';
import { colors, controls, radius, spacing } from '../../src/theme';
import type { MovieSearchCandidate } from '../../src/types/movieSearch';

const handleManualRegistration = () => {};
const keyExtractor = (movie: MovieSearchCandidate) => movie.id;
const Separator = () => <View style={styles.separator} />;

export default function MovieSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { results, status } = useMovieSearch(query);
  const selectMovie = useCallback((id: string) => {
    Keyboard.dismiss();
    router.navigate({ pathname: '/add/selected', params: { id } });
  }, [router]);
  const renderItem: ListRenderItem<MovieSearchCandidate> = useCallback(({ item }) => <MovieSearchResult movie={item} onPress={selectMovie} />, [selectMovie]);
  const goBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/add');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar" onPress={goBack}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton>
        <AppText variant="heading" style={styles.heading}>Buscar filme</AppText>
      </View>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <MovieSearchField value={query} onChangeText={setQuery} />
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          ListEmptyComponent={status === 'loading' ? <VisualFeedback animation="search" label="Buscando filmes" /> : status === 'error' ? <AppText accessibilityRole="alert" color="textMuted" style={styles.empty}>Não foi possível buscar agora</AppText> : status === 'success' ? <VisualFeedback animation="film" loop={false} label="Nenhum filme encontrado" /> : null}
          ListFooterComponent={
            <View style={styles.footer}>
              <Pressable accessibilityRole="button" onPress={handleManualRegistration} style={({ pressed }) => [styles.manual, pressed && styles.pressed]}>
                <AppText variant="label" color="accent" style={styles.manualLabel}>Cadastrar manualmente</AppText>
                <ArrowRight size={controls.iconSize} color={colors.accent} />
              </Pressable>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  heading: { flex: 1 },
  list: { paddingBottom: spacing.lg },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  footer: { alignItems: 'center', paddingTop: spacing.xl },
  manual: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: controls.minTouchSize, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  manualLabel: { flexShrink: 1 },
  pressed: { opacity: controls.pressedOpacity },
});
