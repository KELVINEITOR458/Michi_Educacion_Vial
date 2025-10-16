import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, Easing, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from 'src/utils/colors';
import { useRouter, type Href } from 'expo-router';
import { ProgressApi } from 'src/services/progress';
import { BicycleProgressService } from 'src/services/bicycleProgress';

const { width, height } = Dimensions.get('window');

export default function MinigamesLevel3() {
  const router = useRouter();
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({
    coloring: false,
    quiz: false,
    bicycle: false
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const bgBase = useRef(new Animated.Value(0)).current;
  const bgProgress = Animated.modulo(bgBase, 1);

  const reloadData = useCallback(async () => {
    try {
      const cacheKey = 'level3_completed_activities';
      const cached = (global as any)[cacheKey];
      const now = Date.now();
      if (cached && (now - cached.timestamp) < 5000) {
        setCompletedActivities(cached.activities);
        return;
      }

      // Sincroniza progreso de bici por si terminó fuera de esta pantalla
      try { await BicycleProgressService.syncWithServer(); } catch {}

      const p = await ProgressApi.get();
      const list: string[] = Array.isArray(p.completedGames) ? p.completedGames : [];

      const bicycleKeys = ['3_paseo_bici', '3_2', 'bicycle_completed_level3'];
      const hasBicycleCompleted = bicycleKeys.some(k => list.includes(k));

      const activities = {
        coloring: list.includes('3_colorear_divertidamente') || list.includes('3_6'),
        quiz: list.includes('3_quiz_vial') || list.includes('3_1'),
        bicycle: hasBicycleCompleted,
      };

      (global as any)[cacheKey] = { activities, timestamp: now };
      setCompletedActivities(activities);
    } catch {}
  }, []);

  useEffect(() => {
    // Estado inicial rápido para buena UX
    setCompletedActivities({ coloring: false, quiz: false, bicycle: false });
    const t = setTimeout(() => { reloadData(); }, 100);
    return () => clearTimeout(t);
  }, [reloadData]);

  // Detectar parámetro de refresh como en nivel 2
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const refreshParam = url.searchParams.get('refresh');
      if (refreshParam) setRefreshTrigger(prev => prev + 1);
    } catch {}
  }, []);

  useEffect(() => { if (refreshTrigger > 0) reloadData(); }, [reloadData, refreshTrigger]);

  useEffect(() => {
    const duration = 20000;
    bgBase.setValue(0);
    const loop = Animated.loop(
      Animated.timing(bgBase, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      { resetBeforeIteration: true }
    );
    loop.start();
    return () => { bgBase.stopAnimation(); loop.stop(); };
  }, [bgBase]);

  return (
    <View style={styles.container}>
      <View style={styles.bgContainer} pointerEvents="none">
        <Animated.Image source={require('../../assets/images/fondo_nivel1.png')} style={[styles.bgImage, { transform: [{ translateY: Animated.add(Animated.multiply(bgProgress, height), -height) }] }]} resizeMode="cover" />
        <Animated.Image source={require('../../assets/images/fondo_nivel1.png')} style={[styles.bgImage, { transform: [{ translateY: Animated.multiply(bgProgress, height) }] }]} resizeMode="cover" />
        <Animated.Image source={require('../../assets/images/fondo_nivel1.png')} style={[styles.bgImage, { transform: [{ translateY: Animated.add(Animated.multiply(bgProgress, height), height) }] }]} resizeMode="cover" />
      </View>

      <TouchableOpacity onPress={() => router.push('/welcome' as Href)} activeOpacity={0.85} style={styles.backBtn}>
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <Image source={require('../../assets/images/nivel-3.png')} style={styles.titleImage} resizeMode="contain" />
      <Text style={styles.subtitle}>Elige una actividad para continuar y diviértete aprendiendo</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/images/index-level3' as Href)}>
        <View style={styles.cardInnerColumnLarge}>
          <ImageBackground source={require('../../assets/images/pintor.png')} style={styles.cardTopLarge} imageStyle={styles.cardTopImageCover} resizeMode="cover" />
          <View style={styles.cardBottomLargeGreen}>
            <View style={styles.cardTitleContainer}><Text style={styles.cardTitleLarge}>Colorear divertidamente</Text></View>
            <Text style={styles.cardDescLarge}>Colorea escenas más avanzadas</Text>
          </View>
          <View style={[styles.completionBadge, !completedActivities.coloring && { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]}>
            <Text style={[styles.completionStar, !completedActivities.coloring && { color: '#555' }]}>{completedActivities.coloring ? '⭐' : '☆'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/quiz/main-level3' as Href)}>
        <View style={styles.cardInnerColumnLarge}>
          <ImageBackground source={require('../../assets/images/quizVial.png')} style={styles.cardTopLarge} imageStyle={styles.cardTopImageCover} resizeMode="cover" />
          <View style={styles.cardBottomLargeYellow}>
            <View style={styles.cardTitleContainer}><Text style={styles.cardTitleLarge}>Quiz Vial Nivel 3</Text></View>
            <Text style={styles.cardDescLarge}>Pon a prueba tus conocimientos</Text>
          </View>
          <View style={[styles.completionBadge, !completedActivities.quiz && { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]}>
            <Text style={[styles.completionStar, !completedActivities.quiz && { color: '#555' }]}>{completedActivities.quiz ? '⭐' : '☆'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/bicycle-game-level3' as Href)}>
        <View style={styles.cardInnerColumnLarge}>
          <ImageBackground source={require('../../assets/images/bici.png')} style={styles.cardTopLarge} imageStyle={styles.cardTopImageCover} resizeMode="cover" />
          <View style={styles.cardBottomLargeOrange}>
            <View style={styles.cardTitleContainer}><Text style={styles.cardTitleLarge}>Aventura en Bicicleta Nivel 3</Text></View>
            <Text style={styles.cardDescLarge}>Evita obstáculos y responde preguntas</Text>
          </View>
          <View style={[styles.completionBadge, !completedActivities.bicycle && { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]}>
            <Text style={[styles.completionStar, !completedActivities.bicycle && { color: '#555' }]}>{completedActivities.bicycle ? '⭐' : '☆'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 44 },
  bgContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgImage: { position: 'absolute', width: width, height: '100%', opacity: 1 },
  backBtn: { position: 'absolute', top: 20, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  titleImage: { width: width * 0.48, height: 64, alignSelf: 'center', marginTop: 30, marginBottom: 6 },
  subtitle: { textAlign: 'center', color: colors.white, opacity: 0.9, marginTop: 2, fontSize: width < 400 ? 13 : 15 },
  card: { borderRadius: 14, overflow: 'hidden', marginTop: 11, shadowColor: 'rgba(0,0,0,0.3)', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.29, shadowRadius: 5.5, elevation: 9, position: 'relative' },
  cardInnerColumnLarge: { flexDirection: 'column', alignItems: 'stretch', minHeight: 180 },
  cardTopLarge: { alignItems: 'center', justifyContent: 'center', minHeight: 125 },
  cardTopImageCover: { opacity: 1 },
  cardBottomLargeGreen: { backgroundColor: '#1B5E20', paddingVertical: 13, paddingHorizontal: 13 },
  cardBottomLargeYellow: { backgroundColor: '#F57C00', paddingVertical: 13, paddingHorizontal: 13 },
  cardBottomLargeOrange: { backgroundColor: '#BF360C', paddingVertical: 13, paddingHorizontal: 13 },
  cardTitleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  cardTitleLarge: { color: colors.white, fontWeight: 'bold', fontSize: 19, textAlign: 'left', flex: 1 },
  cardDescLarge: { color: colors.white, opacity: 0.95, marginTop: 5, textAlign: 'left', fontSize: 15 },
  completionBadge: { position: 'absolute', bottom: 25, right: 8, width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 3.5, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  completionStar: { fontSize: 18, color: '#000', fontWeight: '900' },
});


