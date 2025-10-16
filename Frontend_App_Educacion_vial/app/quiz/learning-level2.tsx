import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';

const { width } = Dimensions.get('window');

export default function QuizLearningLevel2() {
  const router = useRouter();
  return (
    <LinearGradient colors={colors.gradientPrimary} style={styles.container}>
      {/* Back Button - Top Left */}
      <TouchableOpacity
        onPress={() => router.replace('/quiz/main-level2' as Href)}
        style={styles.backBtn}
        activeOpacity={0.85}
      >
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Image
          source={require('../../assets/images/quizVial.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>Aprende Nivel 2</Text>
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

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push('/quiz/levels-level2' as Href)}
        activeOpacity={0.85}
      >
        <LinearGradient colors={colors.gradientSuccess} style={styles.btnGradient}>
          <Text style={styles.btnText}>¡Listo! Empezar Quiz Nivel 2</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60, // More padding at the top for the back button
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
    marginBottom: 24,
    marginTop: 12,
  },
  image: {
    width: width < 400 ? 140 : 160,
    height: width < 400 ? 100 : 120,
    marginBottom: 12
  },
  title: {
    fontSize: width < 400 ? 22 : 24,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.white,
    opacity: 0.9,
    fontSize: width < 400 ? 14 : 15,
    paddingHorizontal: 20,
  },
  // Scroll content
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  item: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 12,
    lineHeight: 24,
  },
  // Buttons
  btn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 8,
    shadowColor: colors.shadowDark as any,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginHorizontal: 20,
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
