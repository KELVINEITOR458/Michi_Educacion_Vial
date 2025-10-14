import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import { colors } from '@/utils/colors';
import { ProgressApi } from '@/services/progress';
import { maybeAwardColoringSetStar, maybeRemoveColoringSetStar } from '@/services/progress2';
import { ImagesApi } from '@/services/images';

const { width, height } = Dimensions.get('window');

type TaskId = 'cat-level2' | 'patrol-level2' | 'semaforo-level2';

const TASKS_LEVEL2: Array<{ id: TaskId; title: string; desc: string; tag: string; difficulty: 'medio' | 'avanzado'; emoji: string }> = [
  { id: 'cat-level2', title: 'Gato Policía Nivel 2', desc: 'Colorea escenas más complejas con el gato policía', tag: 'personajes', difficulty: 'medio', emoji: '🐱' },
  { id: 'patrol-level2', title: 'Patrulla Nivel 2', desc: 'Colorea situaciones avanzadas de la patrulla policial', tag: 'transporte', difficulty: 'medio', emoji: '🚓' },
  { id: 'semaforo-level2', title: 'Semáforo Nivel 2', desc: 'Colorea escenarios complejos con semáforos y señales', tag: 'señales', difficulty: 'avanzado', emoji: '🚦' },
];

// Componente de estrellas para 3 tareas nivel 2
function StarsRowLevel2({ completed }: { completed: Record<TaskId, boolean> }) {
  const count = Object.values(completed).filter(Boolean).length;
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 6, marginVertical: 6 }}>
      {[1, 2, 3].map((i) => (
        <Text key={i} style={{ fontSize: 20 }}>{i <= count ? '⭐' : '☆'}</Text>
      ))}
    </View>
  );
}

export default function ImagesMenuLevel2() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Record<TaskId, boolean>>({
    'cat-level2': false,
    'patrol-level2': false,
    'semaforo-level2': false
  });

  const loadCompleted = useCallback(async () => {
    const next: Record<TaskId, boolean> = { 'cat-level2': false, 'patrol-level2': false, 'semaforo-level2': false };

    try {
      const images = await ImagesApi.list();

      // Contar imágenes por categoría nivel 2
      const imagesByCategory: Record<TaskId, number> = { 'cat-level2': 0, 'patrol-level2': 0, 'semaforo-level2': 0 };

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

      setCompleted(next);
    } catch (error) {
      console.error('Error loading completed coloring tasks for level 2:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCompleted();
    }, [loadCompleted])
  );

  const completedCount = Object.values(completed).filter(Boolean).length;

  return (
    <LinearGradient colors={['#90EE90', '#7CB342', colors.gradientVialGreen[0]]} style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/minigames/level2' as Href)} style={styles.backBtn} activeOpacity={0.85}>
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.mascotContainer}>
        <Image source={require('../../assets/images/pintor.png')} style={styles.pintorImage} resizeMode="contain" />
      </View>

      <Text style={styles.title}>🎨 Colorear Divertidamente - Nivel 2</Text>
      <Text style={styles.subtitle}>Elige una imagen avanzada para colorear</Text>

      {/* Estrellas de progreso del set (3 tareas) */}
      <StarsRowLevel2 completed={completed} />

      <Text style={styles.sectionTitle}>🎯 Opciones de Colorear Nivel 2</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {TASKS_LEVEL2.map((task) => (
          <TouchableOpacity key={task.id} style={[styles.card, { position: 'relative' }]} onPress={() => router.push(`/images/draw?task=${task.id}` as Href)}>
            <View style={styles.cardLeftEmoji}>
              <Image
                source={
                  task.id === 'cat-level2'
                    ? require('../../assets/images/policia-coloreado.png')
                    : task.id === 'patrol-level2'
                    ? require('../../assets/images/patrulla-coloreada.png')
                    : require('../../assets/images/semaforo-coloreado.png')
                }
                style={{ width: 46, height: 46, borderRadius: 10 }}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{task.title}</Text>
              <Text style={styles.cardDesc}>{task.desc}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.badgeText}>#{task.tag}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.9)' }]}>
                  <Text style={[styles.badgeText, { color: '#fff' }]}>⭐ {task.difficulty}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.completionBadge, !completed[task.id] && { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
              <Text style={[styles.completionStar, !completed[task.id] && { color: '#555' }]}>{completed[task.id] ? '⭐' : '☆'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.galleryBtn} onPress={() => router.push('/images/gallery' as Href)}>
          <LinearGradient colors={colors.gradientSecondary} style={styles.galleryGradient}>
            <Text style={styles.galleryText}>🖼️ Ver Galería</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 10,
  },
  backImg: {
    width: 96,
    height: 84,
  },
  mascotContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  pintorImage: {
    width: width < 450 ? 200 : 260,
    height: width < 450 ? 180 : 220,
  },
  title: {
    fontSize: width < 400 ? 24 : 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: colors.shadowDark as any,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width < 400 ? 16 : 18,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.white,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
    fontSize: width < 400 ? 18 : 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  completionBadge: { position: 'absolute', bottom: 8, right: 8, width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  completionStar: { fontSize: 20, color: '#000', fontWeight: '900' },
  cardLeftEmoji: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  cardDesc: {
    color: colors.white,
    opacity: 0.95,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.white,
    fontWeight: '600',
  },
  galleryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  galleryGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  galleryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
