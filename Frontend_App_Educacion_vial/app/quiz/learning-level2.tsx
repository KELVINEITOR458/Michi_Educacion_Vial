import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';

const { width } = Dimensions.get('window');

export default function QuizLearningLevel2() {
  const router = useRouter();
  return (
    <ImageBackground source={require('../../assets/images/bg-aprender.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
      {/* Back Button - Top Left */}
      <TouchableOpacity
        onPress={() => router.replace('/quiz/main-level2' as Href)}
        style={styles.backBtn}
        activeOpacity={0.85}
      >
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>📘 Aprende - Nivel 2</Text>
        <Text style={styles.subtitle}>Repasa conceptos avanzados de educación vial.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentCard}>
          <Text style={styles.item}>• Señales de prohibición: indican acciones no permitidas como "No girar" o "No estacionar".</Text>
          <Text style={styles.item}>• Señales de obligación: indican acciones obligatorias como "Ceda el paso" o "Deténgase".</Text>
          <Text style={styles.item}>• Límites de velocidad: respetar los límites urbanos (50 km/h) y en zonas escolares (30 km/h).</Text>
          <Text style={styles.item}>• Distancia de seguridad: mantener al menos 2 segundos de distancia con el vehículo delantero.</Text>
          <Text style={styles.item}>• Rotondas: ceder el paso a quienes ya están circulando y señalizar correctamente.</Text>
          <Text style={styles.item}>• Uso responsable del teléfono: prohibido mientras se conduce, puede causar distracciones fatales.</Text>
          <Text style={styles.item}>• Pasos a nivel: detenerse completamente y esperar a que se levanten las barreras.</Text>
          <Text style={styles.item}>• Emergencias: dar paso inmediato a ambulancias, bomberos y vehículos de emergencia.</Text>
        </View>
      </ScrollView>

      {/* Botón-imagen Continuar (estilo nivel 1) */}
      <TouchableOpacity
        style={styles.imageBtn}
        onPress={() => router.push('/quiz/levels-level2' as Href)}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../assets/images/quiz/boton-play.png')}
          style={styles.btnImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80 },
  // Back button styles
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 10,
  },
  backImg: { width: 96, height: 84 },
  // Header content
  header: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  subtitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.95,
    fontSize: width < 400 ? 14 : 15,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  // Scroll content
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  contentCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  item: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 24,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Botón-imagen estilo nivel 1
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
