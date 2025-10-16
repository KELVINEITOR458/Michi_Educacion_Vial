import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function QuizMainLevel3() {
  const router = useRouter();
  const navLockRef = useRef(false);
  const navigateOnce = useCallback((href: Href) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    router.push(href);
    setTimeout(() => { navLockRef.current = false; }, 800);
  }, [router]);
  return (
    <ImageBackground source={require('../../assets/images/fondo-quiz.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
      {/* Back Button - Top Left */}
      <TouchableOpacity
        onPress={() => router.replace('/minigames/level3' as Href)}
        style={styles.backBtn}
        activeOpacity={0.85}
      >
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.header}>
        {/* Title Card */}
        <View style={styles.titleCard}>
          <Text style={styles.title}>🧠 Quiz Vial - Nivel 3</Text>
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <LinearGradient
            colors={['rgba(100, 170, 220, 0.9)', 'rgba(70, 140, 190, 0.95)']}
            style={styles.cardGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Text style={styles.cardTitle}>Vamos a poner a prueba tus conocimientos</Text>
            <View style={styles.divider} />
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>Demuestra tus conocimientos sobre educación vial y señales de tránsito. Elije tu modo de juego y comienza a aprender</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Botón Empezar Quiz */}
      <TouchableOpacity 
        style={styles.imageBtn} 
        onPress={() => navigateOnce('/quiz/levels-level3' as Href)}
        activeOpacity={0.7}
      >
        <Image 
          source={require('../../assets/images/quiz/boton-play.png')} 
          style={styles.btnImage} 
          resizeMode="contain" 
        />
      </TouchableOpacity>

      {/* Botón Aprender */}
      <TouchableOpacity 
        style={styles.imageBtn} 
        onPress={() => navigateOnce('/quiz/learning-level3' as Href)}
        activeOpacity={0.7}
      >
        <Image 
          source={require('../../assets/images/quiz/boton-aprender.png')} 
          style={styles.btnImage} 
          resizeMode="contain" 
        />
      </TouchableOpacity>

      {/* Botón Competencia en Vivo */}
      <TouchableOpacity 
        style={[styles.imageBtn, { marginBottom: 16 }]} 
        onPress={() => navigateOnce('/quiz/competition' as Href)}
        activeOpacity={0.7}
      >
        <Image 
          source={require('../../assets/images/quiz/boton-compe.png')} 
          style={styles.btnImage} 
          resizeMode="contain" 
        />
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 20, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  header: { alignItems: 'center', marginBottom: 8, marginTop: 34, width: '100%' },
  // Title Card (igual a nivel 1)
  titleCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 8,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  title: { 
    fontSize: width < 400 ? 22 : 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  contentCard: { width: '100%', marginTop: 14, borderRadius: 18, overflow: 'hidden' },
  cardGradient: { borderRadius: 18, padding: 16 },
  cardTitle: { color: colors.white, fontWeight: '800', fontSize: 18 },
  divider: { height: 2, backgroundColor: 'rgba(255,255,255,0.6)', marginVertical: 8, borderRadius: 2 },
  cardContent: {},
  cardText: { color: colors.white, opacity: 0.95 },
  scrollContent: { paddingTop: 10, width: '100%' },
  // Image Buttons (igual a nivel 1)
  imageBtn: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.shadowDark as any,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  btnImage: {
    width: '100%',
    height: width < 400 ? width * 0.35 : width * 0.32,
  },
});


