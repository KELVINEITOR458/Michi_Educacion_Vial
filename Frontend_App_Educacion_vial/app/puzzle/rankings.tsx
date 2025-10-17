import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { PuzzleApi } from '@/services/api';
import { colors } from '@/utils/colors';

export default function PuzzleRankings() {
  const [items, setItems] = useState<Array<{ userId: string; time: number; difficulty: string }>>([]);

  useEffect(() => { (async () => { try { const data = await PuzzleApi.getRankings(); setItems(data); } catch {} })(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Rankings</Text>
      <FlatList
        data={items}
        keyExtractor={(it, idx) => `${it.userId}-${idx}`}
        renderItem={({ item, index }) => (
          <View style={styles.row}><Text style={styles.place}>{index + 1}</Text><Text style={styles.user}>{item.userId}</Text><Text style={styles.meta}>{item.difficulty}</Text><Text style={styles.time}>{item.time}s</Text></View>
        )}
        ListEmptyComponent={<Text style={{ color: colors.white, opacity: 0.9 }}>No hay resultados aún.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, padding: 16, backgroundColor: colors.primary },
  title: { color: colors.white, fontWeight: 'bold', fontSize: 22, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomColor: 'rgba(255,255,255,0.2)', borderBottomWidth: StyleSheet.hairlineWidth },
  place: { width: 32, color: colors.white, fontWeight: '900' },
  user: { flex: 1, color: colors.white, fontWeight: '700' },
  meta: { width: 80, color: colors.white },
  time: { width: 60, color: colors.white, textAlign: 'right' },
});
