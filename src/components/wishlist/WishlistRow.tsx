import {memo} from 'react';
import {Image,Pressable,StyleSheet,View} from 'react-native';
import Film from 'lucide-react-native/icons/film';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import {AppText} from '../ui';
import {desiredFormatLabels,priorityLabels,statusLabels} from '../../services/wishlist/logic';
import type {WishlistItemRow} from '../../services/supabase/types';
import {formatPurchasePrice} from '../../utils/collectionDetails';
import {colors,controls,radius,spacing} from '../../theme';
export const WishlistRow=memo(function WishlistRow({item,onPress}:{item:WishlistItemRow;onPress:(id:string)=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={[item.title,desiredFormatLabels[item.desired_format],`Prioridade ${priorityLabels[item.priority]}`,statusLabels[item.status]].join(', ')} onPress={()=>onPress(item.id)} style={({pressed})=>[styles.row,pressed&&styles.pressed]}>
    <View style={styles.poster}>{item.poster_url?<Image accessible={false} source={{uri:item.poster_url}} style={StyleSheet.absoluteFill} resizeMode="contain" />:<Film size={controls.iconSize} color={colors.textMuted} />}</View>
    <View style={styles.metadata}>
      <AppText variant="searchResultTitle" numberOfLines={2}>{item.title}</AppText>
      <AppText variant="caption" color="textSecondary">{desiredFormatLabels[item.desired_format]}</AppText>
      <AppText variant="caption" color={item.priority==='HIGH'?'accent':'textMuted'}>{priorityLabels[item.priority]} · {statusLabels[item.status]}</AppText>
      {item.target_price!==null&&<AppText variant="caption" color="accent">Preço-alvo: {formatPurchasePrice(item.target_price)}</AppText>}
    </View><ChevronRight size={spacing.md} color={colors.textMuted} />
  </Pressable>;
});
const styles=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingVertical:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},pressed:{opacity:controls.pressedOpacity},poster:{width:spacing.xl*2,aspectRatio:2/3,borderRadius:radius.sm,overflow:'hidden',backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},metadata:{flex:1,minWidth:0,gap:spacing.xs}});
