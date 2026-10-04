import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { radii, workTypeColors } from '@/theme/tokens';

export type WorkTypeKey = keyof typeof workTypeColors;
export type WorkTypeLegendItem = { type: WorkTypeKey; label: string };
export type WorkTypeLegendProps = { items: readonly WorkTypeLegendItem[]; testID?: string };
export function WorkTypeLegend({ items, testID }: WorkTypeLegendProps) {
  return <View style={styles.legend} testID={testID}>{items.map((item) => <View key={item.type} style={styles.item}><View style={[styles.color, { backgroundColor: workTypeColors[item.type] }]} /><AppText variant="caption">{item.label}</AppText></View>)}</View>;
}
const styles = StyleSheet.create({ legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 10 }, item: { alignItems: 'center', flexDirection: 'row', gap: 2 }, color: { borderRadius: radii.full, height: 19, width: 19 } });
