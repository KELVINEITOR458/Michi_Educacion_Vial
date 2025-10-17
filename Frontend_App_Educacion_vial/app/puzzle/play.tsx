import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/utils/colors';
import { PuzzleApi } from '@/services/api';
import PuzzleGrid from './PuzzleGrid';

const { width } = Dimensions.get('window');

type Grid = '3x3' | '3x5' | '4x4' | '6x6';

export default function PuzzlePlay() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const gridParam = (params.grid as string) || '3x5';
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Array<{ url: string; row: number; col: number }> | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [completed, setCompleted] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);

  const [cols, rows] = useMemo(() => {
    if (gridParam === '3x3') return [3, 3]; // 9 piezas
    if (gridParam === '3x5') return [5, 3]; // 15 piezas  
    if (gridParam === '4x4') return [4, 4]; // 16 piezas
    if (gridParam === '6x6') return [6, 6]; // 36 piezas
    return [3, 3]; // Default 9 piezas
  }, [gridParam]);

  // Función para mostrar el título correcto del puzzle
  const getDisplayTitle = () => {
    if (gridParam === '3x3') return '3X3';
    if (gridParam === '3x5') return '5X5'; // Mostrar 5x5 como el usuario espera
    if (gridParam === '4x4') return '4X4';
    if (gridParam === '6x6') return '6X6';
    return 'PUZZLE'; // Fallback
  };

// Cargar imagen base desde el backend según el grid (para preview)
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const { imageUrl } = await PuzzleApi.getImage();
      if (mounted) {
        setImgUrl(imageUrl);
        setStartedAt(Date.now());
      }
    } catch (error) {
      console.warn('Error loading images:', error);
    }
  })();
  return () => { mounted = false; };
}, [gridParam]);

// No cargar piezas del backend por ahora - usar generación local
useEffect(() => {
  setTiles(null); // Forzar generación local
}, [gridParam]);


  const completePuzzle = async () => {
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync(require('../../assets/sounds/success.mp3'));
      await sound.playAsync();
    } catch (error) {
      console.warn('Error playing sound:', error);
    }

    const time = Math.round((Date.now() - startedAt) / 1000);
    setShowCongrats(true);

    // Guardar local
    try {
      await AsyncStorage.setItem('puzzle:last', JSON.stringify({ grid: gridParam, time, completed: true }));
    } catch (error) {
      console.warn('Error saving locally:', error);
    }

    // Enviar backend
    try {
      await PuzzleApi.postResult({ userId: 'local-user', time, completed: true, difficulty: gridParam });
    } catch (error) {
      console.warn('Error sending to backend:', error);
    }

    // Marcar progreso
    try {
      const { ProgressApi } = await import('@/services/progress');
      const current = await ProgressApi.get();
      const completed = Array.isArray(current.completedGames) ? current.completedGames : [];

      // Marcar diferentes logros según el tamaño del puzzle
      let achievement = '3_puzzle_completed'; // Default
      if (gridParam === '6x6') achievement = '6x6_puzzle_completed';
      else if (gridParam === '4x4') achievement = '4x4_puzzle_completed';
      else if (gridParam === '3x5') achievement = '5x3_puzzle_completed';

      await ProgressApi.update({
        completedGames: [...completed, achievement]
      });
    } catch (error) {
      console.warn('Error updating progress:', error);
    }
  };

  const reset = () => {
    setCompleted(false);
    setStartedAt(Date.now());
  };

  const handleCongratsClose = () => {
    setShowCongrats(false);
    router.replace('/puzzle' as Href);
  };

  if (!imgUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando imagen...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/puzzle' as Href)} style={styles.backBtn}>
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      <Text style={styles.title}>🧩 {getDisplayTitle()}</Text>

      <PuzzleGrid
        imageSource={imgUrl ? { uri: imgUrl } : require('../../assets/images/personaje1.png')}
        gridSize={cols}
        showPreview={showPreview}
        tiles={tiles || undefined}
        onPieceUpdate={(id, x, y, fixed) => {
          // Log eliminado para reducir ruido en consola
        }}
        onComplete={completePuzzle}
      />

      <View style={styles.row}>
        <TouchableOpacity style={styles.actionBtn} onPress={reset}>
          <Text style={styles.actionText}>Reiniciar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPreview(prev => !prev)}>
          <Text style={styles.actionText}>{showPreview ? 'Ocultar' : 'Mostrar'} vista</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/puzzle/rankings' as Href)}>
          <Text style={styles.actionText}>🏆 Rankings</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCongrats} transparent animationType="fade" onRequestClose={handleCongratsClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¡Felicidades!</Text>
            <Text style={styles.modalText}>Rompecabezas completado correctamente</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowCongrats(false); reset(); }}>
                <Text style={styles.modalBtnText}>🔄 Reintentar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleCongratsClose}>
                <Text style={styles.modalBtnText}>✅ Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: colors.primary
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 10
  },
  backImg: {
    width: 96,
    height: 84
  },
  loadingText: {
    color: colors.white,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50
  },
  title: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  actionBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  actionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 14,
    padding: 20,
    width: '90%',
    alignItems: 'center'
  },
  modalTitle: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 8
  },
  modalText: {
    color: colors.white,
    opacity: 0.9,
    marginBottom: 16,
    textAlign: 'center'
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12
  },
  modalBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modalBtnText: {
    color: colors.white,
    fontWeight: '600'
  }
});