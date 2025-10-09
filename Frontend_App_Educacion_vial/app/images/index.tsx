import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import { colors } from '@/utils/colors';
import { ProgressApi } from '@/services/progress';
import { maybeAwardColoringSetStar, maybeRemoveColoringSetStar } from '@/services/progress2';
import { ImagesApi } from '@/services/images';

const { width, height } = Dimensions.get('window');

type TaskId = 'cat' | 'patrol' | 'semaforo';

const TASKS: Array<{ id: TaskId; title: string; desc: string; tag: string; difficulty: 'fácil' | 'medio'; emoji: string }> = [
  { id: 'cat', title: 'Gato Policía', desc: 'Colorea al gato policía con tu propia arte', tag: 'personajes', difficulty: 'fácil', emoji: '🐱' },
  { id: 'patrol', title: 'Patrulla', desc: 'Colorea la patrulla policial', tag: 'transporte', difficulty: 'fácil', emoji: '🚓' },
  { id: 'semaforo', title: 'Semáforo', desc: 'Colorea el semáforo y aprende las señales', tag: 'señales', difficulty: 'fácil', emoji: '🚦' },
];

export default function ImagesMenu() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Record<TaskId, boolean>>({ cat: false, patrol: false, semaforo: false });

  const loadCompleted = useCallback(async () => {
    const next: Record<TaskId, boolean> = { cat: false, patrol: false, semaforo: false };

    try {
      const images = await ImagesApi.list();

      // Contar imágenes por categoría
      const imagesByCategory: Record<TaskId, number> = { cat: 0, patrol: 0, semaforo: 0 };

      images.forEach((image) => {
        const baseImage = image.data?.baseImage as TaskId | undefined;
        if (baseImage && Object.prototype.hasOwnProperty.call(imagesByCategory, baseImage)) {
          imagesByCategory[baseImage]++;
        }
      });

      // Verificar si cada categoría tiene al menos 1 imagen
      Object.keys(imagesByCategory).forEach((category) => {
        const cat = category as TaskId;
        if (imagesByCategory[cat] > 0) {
          next[cat] = true;
        }
      });

      // Solo marcar tareas como completadas si tienen imágenes físicas
      Object.keys(next).forEach((category) => {
        const cat = category as TaskId;
        next[cat] = imagesByCategory[cat] > 0;
      });

    } catch (error) {
      try {
        const progress = await ProgressApi.get();
        const list: string[] = Array.isArray(progress.completedGames) ? progress.completedGames : [];
        next.cat = list.includes('1_coloring_cat');
        next.patrol = list.includes('1_coloring_patrol');
        next.semaforo = list.includes('1_coloring_semaforo');
      } catch (_progressError) {
        // Ignorar
      }
    }

    setCompleted(next);

    // Verificar si se completaron las 3 categorías con imágenes físicas
    const totalImages = Object.values(next).filter(Boolean).length;
    if (totalImages >= 3) {
      try {
        await maybeAwardColoringSetStar();
      } catch {}
    } else {
      // Si no se cumplen los requisitos, eliminar la estrella
      try {
        await maybeRemoveColoringSetStar();
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadCompleted();
  }, [loadCompleted]);

  useFocusEffect(
    useCallback(() => {
      loadCompleted();
    }, [loadCompleted])
  );

  return (
    <LinearGradient colors={['#90EE90', '#7CB342', colors.gradientVialGreen[0]]} style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/minigames/level1' as Href)} style={styles.backBtn} activeOpacity={0.85}>
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.mascotContainer}>
        <Image source={require('../../assets/images/pintor.png')} style={styles.pintorImage} resizeMode="contain" />
      </View>

      <Text style={styles.title}>🎨 Colorear Divertidamente</Text>
      <Text style={styles.subtitle}>Elige una imagen para colorear y crear tu obra de arte</Text>


      {/* Estrellas de progreso del set (3 tareas) */}
      <StarsRow completed={completed} />

      <Text style={styles.sectionTitle}>🎯 Opciones de Colorear</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {TASKS.map((t) => (
          <TouchableOpacity key={t.id} style={styles.card} onPress={() => router.push(`/images/draw?task=${t.id}` as Href)}>
            <View style={styles.cardLeftEmoji}><Text style={{ fontSize: 36 }}>{t.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <Text style={styles.cardDesc}>{t.desc}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.badgeText}>#{t.tag}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.9)' }]}>
                  <Text style={[styles.badgeText, { color: '#fff' }]}>⭐ {t.difficulty}</Text>
                </View>
                {completed[t.id] && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(251,191,36,0.95)' }]}>
                    <Text style={[styles.badgeText, { color: '#000', fontWeight: '700' }]}>Completado</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.galleryBtn} onPress={() => router.push('/images/gallery?from=level1' as Href)}>
          <Image source={require('../../assets/images/btn-galeria.jpg')} style={styles.galleryImage} resizeMode="contain" />
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 90 },
  backBtn: { position: 'absolute', top: 20, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  title: { fontSize: width < 400 ? 24 : 28, fontWeight: 'bold', color: colors.white, textAlign: 'left' },
  subtitle: { fontSize: width < 400 ? 14 : 16, color: colors.white, opacity: 0.9, marginTop: 4 },
  mascotContainer: { alignItems: 'center', marginVertical: 12 },
  pintorImage: { width: width < 450 ? 200 : 260, height: width < 450 ? 180 : 220 },
  sectionTitle: { color: colors.white, fontWeight: '800', marginBottom: 8, marginTop: 8 },
  card: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 12, alignItems: 'center', marginBottom: 10 },
  cardLeftEmoji: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitle: { color: colors.white, fontWeight: '700', fontSize: 16 },
  cardDesc: { color: colors.white, opacity: 0.95, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: colors.white, fontWeight: '600' },
  galleryBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  galleryGradient: { paddingVertical: 12, alignItems: 'center' },
  galleryText: { color: colors.white, fontWeight: '700' },
  galleryImage: { width: '100%', height: 60 },
});

// Componente de estrellas para 3 tareas
function StarsRow({ completed }: { completed: Record<'cat' | 'patrol' | 'semaforo', boolean> }) {
  const count = (completed.cat ? 1 : 0) + (completed.patrol ? 1 : 0) + (completed.semaforo ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 6, marginVertical: 6 }}>
      {[1, 2, 3].map((i) => (
        <Text key={i} style={{ fontSize: 20 }}>{i <= count ? '⭐' : '☆'}</Text>
      ))}
    </View>
  );
}

