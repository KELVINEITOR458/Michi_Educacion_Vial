import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';

const { width } = Dimensions.get('window');

export default function QuizLearningLevel3() {
  const router = useRouter();
  return (
    <ImageBackground source={require('../../assets/images/bg-aprender.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
      <TouchableOpacity onPress={() => router.replace('/quiz/main-level3' as Href)} style={styles.backBtn} activeOpacity={0.85}>
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>📘 Aprende - Nivel 3</Text>
        <Text style={styles.subtitle}>Repasa antes de comenzar el desafío final.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.point}>• Señales reglamentarias y su prioridad</Text>
        <Text style={styles.point}>• Comportamiento en rotondas y cruces complejos</Text>
        <Text style={styles.point}>• Conducción segura con condiciones adversas</Text>
      </View>

      <TouchableOpacity style={styles.imageBtn} onPress={() => router.replace('/quiz/levels-level3' as Href)} activeOpacity={0.7}>
        <Image source={require('../../assets/images/quiz/boton-play.png')} style={styles.btnImage} resizeMode="contain" />
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80 },
  backBtn: { position: 'absolute', top: 20, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
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
  title: { color: '#FFFFFF', fontWeight: '900', fontSize: 24, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  subtitle: { color: '#FFFFFF', opacity: 0.95, textAlign: 'center', marginTop: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, fontWeight: '500' },
  card: { marginTop: 16, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  point: { color: colors.white, marginBottom: 6 },
  imageBtn: { marginTop: 8, width: '100%', alignItems: 'center', shadowColor: colors.shadowDark as any, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  btnImage: { width: '100%', height: width < 400 ? width * 0.35 : width * 0.32 },
});


