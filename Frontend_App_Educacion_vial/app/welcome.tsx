import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Image, Modal, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { ProgressApi } from '@/services/progress';
import { AuthService } from '@/services/auth';
import { useRouter, type Href } from 'expo-router';
const { width, height } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const bgBase = useRef(new Animated.Value(0)).current;
  const buttonScalesRef = useRef<Record<number, Animated.Value>>({}).current;
  const bgProgress = Animated.modulo(bgBase, 1);
  const settingsScale = useRef(new Animated.Value(1)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;

  const openSettings = () => {
    setShowSettingsModal(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(modalOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(modalScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      ]).start();
    });
  };

  const closeSettings = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.spring(modalScale, { toValue: 0.9, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start(() => {
      setShowSettingsModal(false);
      if (after) after();
    });
  };
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any | null>(null);
  const [userName, setUserName] = useState<string>('Amigo');
  const [greeting, setGreeting] = useState<string>('¡Bienvenido');

  const calculatePointsForLevel = (completedGames: string[], level: number): number => {
    if (!completedGames) return 0;

    // Definir las actividades por nivel y sus puntos individuales
    const levelActivities = {
      1: {
        activities: ['1_quiz_vial', '1_colorear_divertidamente', '1_paseo_bici'],
        totalPoints: 25,
        pointsPerActivity: 25 / 3 // ~8.33 puntos por actividad
      },
      2: {
        activities: ['2_quiz_vial', '2_colorear_divertidamente', '2_paseo_bici'],
        totalPoints: 25,
        pointsPerActivity: 25 / 3
      },
      3: {
        activities: ['3_quiz_vial', '3_colorear_divertidamente', '3_paseo_bici'],
        totalPoints: 25,
        pointsPerActivity: 25 / 3
      }
    };

    const levelConfig = levelActivities[level as keyof typeof levelActivities];
    if (!levelConfig) return 0;

    // Contar cuántas actividades del nivel están completadas
    const completedCount = levelConfig.activities.filter(activity =>
      completedGames.includes(activity)
    ).length;

    // Calcular puntos totales para este nivel
    const levelPoints = Math.round((levelConfig.pointsPerActivity * completedCount) * 100) / 100;

    return levelPoints;
  };

  const getStarsForLevel = (completedGames: string[], level: number): number => {
    const levelPoints = calculatePointsForLevel(completedGames, level);
    const pointsPerStar = 25 / 3; // ~8.33 puntos por estrella
    return Math.floor((levelPoints / pointsPerStar) + 0.5); // Redondear al número de estrellas más cercano
  };

  const calculateTotalPoints = (completedGames: string[]): number => {
    let totalPoints = 0;

    // Calcular puntos para cada nivel
    for (let level = 1; level <= 3; level++) {
      totalPoints += calculatePointsForLevel(completedGames, level);
    }

    return Math.round(totalPoints * 100) / 100;
  };

  useEffect(() => {
    // Background animation
    const duration = 15000;
    bgBase.setValue(0);
    const loop = Animated.loop(
      Animated.timing(bgBase, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    loop.start();

    // Load user data
    const loadUserData = async () => {
      const session = await AuthService.getSession();
      if (!session?.accessToken || !session?.childId) {
        router.replace('/(auth)/login' as Href);
        return;
      }

      try {
        const p = await ProgressApi.get();
        setProgress(p);

        // Calcular puntos reales basados en actividades completadas
        const calculatedPoints = calculateTotalPoints(p.completedGames);
        const currentPoints = p.points || 0;

        // Si hay discrepancia entre puntos calculados y puntos actuales, actualizar
        if (Math.abs(calculatedPoints - currentPoints) > 0.01) {
          await ProgressApi.update({
            points: calculatedPoints
          });

          // Recargar progreso actualizado
          const updatedProgress = await ProgressApi.get();
          setProgress(updatedProgress);
        }

        // Check if level 2 should be unlocked (level 1 has 3 activities completed)
        const level1Stars = getStarsForLevel(p.completedGames, 1);

        if (level1Stars >= 3) {
          const shouldUnlockLevel2 = !p.unlockedLevels?.includes(2);
          if (shouldUnlockLevel2) {
            await ProgressApi.update({
              unlockedLevels: [...(p.unlockedLevels || [1]), 2]
            });

            const updatedProgress = await ProgressApi.get();
            setProgress(updatedProgress);
          }
        }

        // Get user's first name and determine greeting based on gender
        let firstName = 'Amigo';
        let currentGreeting = '¡Bienvenido';

        if (session.childName) {
          firstName = session.childName.split(' ')[0];
        } else if (session.childId) {
          firstName = session.childId.split('-')[0];
        }

        // Determine greeting based on gender
        if (session.childSex === 'FEMALE') {
          currentGreeting = '¡Bienvenida';
        }

        setUserName(firstName);
        setGreeting(currentGreeting);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    return () => {
      bgBase.stopAnimation();
      loop.stop();
    };
  }, []);

  const onLogout = async () => {
    await AuthService.logout();
    router.replace('/(auth)/login' as Href);
  };

  if (loading || !progress) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Fondo animado */}
        <View style={styles.bgContainer} pointerEvents="none">
          <Animated.Image
            source={require('../assets/images/background-welcome.png')}
            style={[styles.bgImage, { transform: [{ translateX: Animated.add(Animated.multiply(bgProgress, width), -width) }] }]}
            resizeMode="cover"
          />
          <Animated.Image
            source={require('../assets/images/background-welcome.png')}
            style={[styles.bgImage, { transform: [{ translateX: Animated.multiply(bgProgress, width) }] }]}
            resizeMode="cover"
          />
          <Animated.Image
            source={require('../assets/images/background-welcome.png')}
            style={[styles.bgImage, { transform: [{ translateX: Animated.add(Animated.multiply(bgProgress, width), width) }] }]}
            resizeMode="cover"
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <View style={styles.welcomeRow}>
              <View style={styles.welcomeCard}>
                <Image source={require('../assets/images/gatoLogo.png')} style={styles.welcomeCatImage} resizeMode="contain" />
                <Text style={styles.welcomeText} numberOfLines={1} adjustsFontSizeToFit>
                  {greeting}, {userName}!
                </Text>
              </View>
            </View>
            <View style={styles.rightSection}>
              <View style={[styles.statPill, { marginRight: 8 }]}>
                <Text style={styles.statIcon}>🪙</Text>
                <Text style={styles.statText}>{progress.coins ?? 0}</Text>
              </View>
              <Animated.View style={{ transform: [{ scale: settingsScale }] }}>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={openSettings}
                  onPressIn={() => {
                    Animated.spring(settingsScale, {
                      toValue: 0.92,
                      useNativeDriver: true,
                      friction: 5,
                      tension: 200,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(settingsScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      friction: 5,
                      tension: 200,
                    }).start();
                  }}
                  activeOpacity={0.9}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir ajustes"
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.6)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.settingsGradient}
                  >
                    <Text style={styles.settingsIcon}>⚙️</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Licencia Digital */}
          <View style={styles.licenseBox}>
            <View style={styles.licenseHeader}>
              <Text style={styles.licenseTitle}>🏆 Licencia Digital</Text>
              <Text style={styles.licenseSubtitle}>{progress.points || 0} / 75 puntos</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(((progress.points || 0) / 75) * 100, 100)}%` }]} />
            </View>
          </View>

          {/* Niveles */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.islandsContainer}>
            {([1, 2, 3, 4, 5] as const).map((lvl) => {
              const buttonScale = buttonScalesRef[lvl] || (buttonScalesRef[lvl] = new Animated.Value(1));
              const isUnlocked = progress.unlockedLevels?.includes(lvl) ?? (lvl === 1);
              const isLocked = !isUnlocked;

              // Lógica específica para cada nivel
              let shouldUnlockLevel2 = false;
              let shouldUnlockLevel3 = false;

              if (lvl === 2) {
                const level1Stars = getStarsForLevel(progress.completedGames, 1);
                shouldUnlockLevel2 = level1Stars >= 3 && !isUnlocked;
              } else if (lvl === 3) {
                // Para el nivel 3, verificar si se completó el nivel 2 (por simplicidad)
                shouldUnlockLevel3 = progress.unlockedLevels?.includes(2) && !isUnlocked;
              }

              return (
                <View key={lvl} style={[styles.islandCard, isLocked && styles.lockedIslandCard]}>
                  <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.islandGradient}>
                    <View style={styles.islandHeaderArea}>
                      <View style={styles.starsBackground}>
                        <View style={styles.starsContainer}>
                          {[1, 2, 3].map((n) => (
                            <Text key={n} style={styles.starText}>
                              {(() => {
                                const starsForLevel = getStarsForLevel(progress.completedGames, lvl);
                                return starsForLevel >= n ? '⭐' : '☆';
                              })()}
                            </Text>
                          ))}
                        </View>
                      </View>
                      <Image
                        source={require('../assets/images/isla12.png')}
                        style={[styles.islandImage, isLocked && styles.lockedIslandImage]}
                        resizeMode="contain"
                      />
                      <Image
                        source={
                          lvl === 1 ? require('../assets/images/nivel-1.png') :
                          lvl === 2 ? require('../assets/images/nivel-2.png') :
                          lvl === 3 ? require('../assets/images/nivel-3.png') :
                          lvl === 4 ? require('../assets/images/nivel-4.png') :
                          require('../assets/images/nivel-5.png')
                        }
                        style={styles.titleImage}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.islandButtonContainer}>
                      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                          style={[styles.islandButton, isLocked && styles.lockedIslandButton]}
                          onPress={() => {
                            if (isUnlocked || shouldUnlockLevel2 || shouldUnlockLevel3) {
                              Animated.sequence([
                                Animated.timing(buttonScale, {
                                  toValue: 0.9,
                                  duration: 100,
                                  useNativeDriver: true,
                                }),
                                Animated.timing(buttonScale, {
                                  toValue: 1,
                                  duration: 100,
                                  useNativeDriver: true,
                                }),
                              ]).start();

                              setTimeout(() => {
                                if (lvl === 2) {
                                  router.push('/minigames/level2' as Href);
                                } else {
                                  router.push('/minigames/level1' as Href);
                                }
                              }, 150);
                            }
                          }}
                          disabled={isLocked && !shouldUnlockLevel2 && !shouldUnlockLevel3}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={require('../assets/images/boton-jugar.png')}
                            style={[styles.playImage, isLocked && { opacity: 0.6 }]}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    </View>

                    {isLocked && (
                      <View style={styles.lockOverlay}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.lockMessage}>Nivel Bloqueado</Text>
                        <Text style={styles.lockRequirement}>
                          {lvl === 2 ? (shouldUnlockLevel2 ? '¡Desbloqueado!' : 'Completa las 3 estrellas del Nivel 1') :
                            lvl === 3 ? (shouldUnlockLevel3 ? '¡Desbloqueado!' : 'Completa el Nivel 2') :
                              lvl === 4 ? 'Completa el Nivel 3' :
                                'Completa el Nivel 4'}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerButtons}>
            <TouchableOpacity style={[styles.footerBtn, { marginTop: 8 }]} onPress={() => router.push('/album' as Href)} activeOpacity={0.85}>
              <Image
                source={require('../assets/images/boton-album.png')}
                style={styles.albumImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={() => router.push('/achievements' as Href)} activeOpacity={0.85}>
              <Image
                source={require('../assets/images/boton-logros.png')}
                style={styles.achievementsImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal Ajustes */}
        <Modal
          visible={showSettingsModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => closeSettings()}
        >
          <View style={styles.modalOverlay}>
            <Animated.Image
              source={require('../assets/images/ecim-config.png')}
              style={[styles.modalTopImage, { opacity: modalOpacity }]}
              resizeMode="contain"
            />
            <Animated.View style={[styles.modalContent, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
              <LinearGradient colors={["#FFE082", "#FFD54F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
                <Text style={styles.modalHeaderIcon}>⚙️</Text>
                <Text style={styles.modalTitle}>Ajustes</Text>
              </LinearGradient>

              <TouchableOpacity
                style={[styles.modalOption, styles.modalLogoutOption]}
                onPress={async () => {
                  closeSettings(async () => {
                    await onLogout();
                  });
                }}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
              >
                <Text style={[styles.modalOptionText, styles.modalLogoutText]}>🚪 Cerrar sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, styles.modalCancelOption]}
                onPress={() => closeSettings()}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={styles.modalCancelText}>❌ Cancelar</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 1, paddingTop: 55, paddingBottom: 30 },
  bgContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgImage: { position: 'absolute', width: width, height: '100%', opacity: 0.6 },
  header: { marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 4, flex: 1 },
  rightSection: { flexDirection: 'row', alignItems: 'center' },
  welcomeText: {
    color: 'black',
    fontSize: width < 400 ? 22 : 28,
    fontWeight: 'bold',
    marginLeft: 0.1,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  welcomeCatImage: { width: width < 400 ? 35 : 40, height: width < 400 ? 35 : 40 },
  settingsButton: { borderRadius: 24, marginRight: 8 },
  settingsGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  settingsIcon: { color: '#000000', fontSize: 20, fontWeight: 'bold' },
  statPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statIcon: { fontSize: 18, marginRight: 6 },
  statText: { fontSize: 16, fontWeight: 'bold', color: '#000000' },
  licenseBox: { marginBottom: 10, backgroundColor: 'rgba(255, 215, 0, 0.3)', borderRadius: 12, padding: 16, marginTop: 20, width: '96%', marginHorizontal: 8 },
  licenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  licenseTitle: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  licenseSubtitle: { fontSize: 16, color: '#000000', backgroundColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  progressBarBg: { width: '100%', height: 12, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.accent },
  islandsContainer: { paddingHorizontal: 10 },
  islandCard: { width: width * 0.8, height: height * 0.56, marginRight: 16, borderRadius: 30, overflow: 'hidden', shadowColor: colors.shadowDark as any, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 3, borderColor: '#000000' },
  islandGradient: { flex: 1, padding: 20, borderRadius: 10, position: 'relative' },
  islandHeaderArea: { alignItems: 'center', flex: 1, justifyContent: 'flex-start', zIndex: 1 },
  islandImage: { width: width * 0.55, height: width * 0.55, marginBottom: 1, marginTop: 0.25 },
  titleImage: { width: width * 0.4, height: 60, alignSelf: 'center', marginBottom: 5 },
  starsBackground: { backgroundColor: 'rgba(189, 89, 22, 0.2)', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 7 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  starText: { fontSize: 20, marginHorizontal: 3 },
  islandButtonContainer: { zIndex: 1, marginTop: 20 },
  islandButton: { borderRadius: 16 },
  playImage: { width: width * 1, height: 70, alignSelf: 'center' },
  lockedIslandCard: { opacity: 0.7 },
  lockedIslandImage: { opacity: 0.6 },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 25, zIndex: 10, padding: 30 },
  lockIcon: { fontSize: 60, color: '#fff', marginBottom: 20 },
  lockMessage: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 15 },
  lockRequirement: { fontSize: 18, color: '#ddd', textAlign: 'center', paddingHorizontal: 20, lineHeight: 24 },
  lockedIslandButton: { opacity: 0.6 },
  footerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 8 },
  footerBtn: { flex: 1, marginHorizontal: 6, borderRadius: 16, overflow: 'hidden' },
  albumImage: { width: '100%', height: 120 },
  achievementsImage: { width: '100%', height: 120 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '80%', maxWidth: 400 },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#333', marginLeft: 10 },
  modalOption: { padding: 15, borderRadius: 10, marginVertical: 5, alignItems: 'center' },
  modalOptionText: { fontSize: 18, color: '#333', fontWeight: '500' },
  modalLogoutOption: { backgroundColor: '#ff4444' },
  modalLogoutText: { color: '#FFFFFF' },
  modalCancelOption: { backgroundColor: '#f0f0f0' },
  modalCancelText: { fontSize: 18, color: '#666', fontWeight: '500' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14, marginBottom: 12 },
  modalHeaderIcon: { fontSize: 22, marginRight: 8 },
  modalTopImage: { position: 'absolute', top: '16%', width: '70%', height: 140 },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    maxWidth: width * 0.65, // Limitar el ancho máximo 
  },
});
