import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function QuizMain() {
  const router = useRouter();
  return (
    <ImageBackground source={require('../../assets/images/fondo-quiz.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
      {/* Back Button - Top Left */}
      <TouchableOpacity 
        onPress={() => router.replace('/minigames/level1' as Href)} 
        style={styles.backBtn} 
        activeOpacity={0.85}
      >
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.header}> 
        
        {/* Title Card */}
        <View style={styles.titleCard}>
          <Text style={styles.title}>🧠 Quiz Vial - Nivel 1</Text>
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
        onPress={() => router.push('/quiz/levels' as Href)}
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
        onPress={() => router.push('/quiz/learning' as Href)}
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
        onPress={() => router.push('/quiz/competition' as Href)}
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
  container: { 
    flex: 1, 
    padding: 16, 
    paddingTop: 50, // More padding at the top for the back button
    alignItems: 'center',
  },
  // Back button styles
  backBtn: { 
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 10,
  },
  backImg: { width: 96, height: 84 },
  // Header content
  header: { 
    alignItems: 'center', 
    marginBottom: 8,
    marginTop: 34,
    width: '100%',
  },
  image: { 
    width: width < 300 ? 200 : 260, 
    height: width < 300 ? 180 : 220, 
    marginBottom: 16,
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
  // Title Card
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subtitle: { 
    textAlign: 'center', 
    color: '#FFFFFF', 
    fontSize: width < 400 ? 14 : 15,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontWeight: '600',
  },
  // Content Card Styles
  contentCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 500, // Ancho máximo para pantallas grandes
    marginTop: 4,
    marginBottom: 8,
    shadowColor: colors.shadowDark as any,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 14,
    width: '35%',
    alignSelf: 'center',
    borderRadius: 2,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  cardText: {
    textAlign: 'center',
    color: '#ffffff',
    opacity: 0.95,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  // Buttons
  btn: { 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginTop: 16,
    shadowColor: colors.shadowDark as any, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4.65, 
    elevation: 8,
    width: '100%',
    maxWidth: 500, // Mismo ancho máximo que la tarjeta
  },
  btnGradient: { 
    paddingVertical: 16, 
    alignItems: 'center',
    width: '100%',
  },
  btnText: { 
    color: colors.white, 
    fontWeight: '700',
    fontSize: 16,
  },
  // Image Buttons
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
