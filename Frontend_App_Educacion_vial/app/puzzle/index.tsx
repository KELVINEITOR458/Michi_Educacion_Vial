import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, FlatList, Image, Modal } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors } from '@/utils/colors';
import { PuzzleApi } from '@/services/api';

interface PuzzleImage {
  id: string;
  name: string;
  url: string;
}

export default function PuzzleHome() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<PuzzleImage | null>(null);
  const [availableImages, setAvailableImages] = useState<PuzzleImage[]>([]);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableImages();
  }, []);

  const loadAvailableImages = async () => {
    try {
      setLoading(true);
      const response = await PuzzleApi.getAvailableImages();
      setAvailableImages(response.images);

      // Seleccionar la primera imagen por defecto
      if (response.images.length > 0) {
        setSelectedImage(response.images[0]);
      }
    } catch (error) {
      console.warn('Error loading images:', error);
      // Fallback a imágenes locales
      setAvailableImages([
        { id: 'quizVial', name: 'Educación Vial', url: 'local://quizVial.png' },
        { id: 'personaje1', name: 'Personaje 1', url: 'local://personaje1.png' },
        { id: 'personaje2', name: 'Personaje 2', url: 'local://personaje2.png' }
      ]);
      setSelectedImage({ id: 'quizVial', name: 'Educación Vial', url: 'local://quizVial.png' });
    } finally {
      setLoading(false);
    }
  };

  const startPuzzle = (grid: string) => {
    if (!selectedImage) return;

    router.push(`/puzzle/play?imageId=${selectedImage.id}&grid=${grid}` as Href);
  };

  const renderImageItem = ({ item }: { item: PuzzleImage }) => (
    <TouchableOpacity
      style={[
        styles.imageItem,
        selectedImage?.id === item.id && styles.selectedImageItem
      ]}
      onPress={() => setSelectedImage(item)}
    >
      <Image
        source={item.id === 'quizVial'
          ? require('../../assets/images/quizVial.png')
          : item.id === 'personaje1'
          ? require('../../assets/images/personaje1.png')
          : require('../../assets/images/personaje2.png')
        }
        style={styles.imageThumbnail}
        resizeMode="cover"
      />
      <Text style={[
        styles.imageName,
        selectedImage?.id === item.id && styles.selectedImageName
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={require('../../assets/images/fondo-quiz.png')} style={styles.container} resizeMode="cover">
      <Text style={styles.title}>🧩 Rompecabezas</Text>

      <TouchableOpacity
        style={styles.imageSelector}
        onPress={() => setShowImageSelector(true)}
      >
        {selectedImage ? (
          <>
            <Image
              source={selectedImage.id === 'quizVial'
                ? require('../../assets/images/quizVial.png')
                : selectedImage.id === 'personaje1'
                ? require('../../assets/images/personaje1.png')
                : require('../../assets/images/personaje2.png')
              }
              style={styles.selectedImage}
              resizeMode="cover"
            />
            <Text style={styles.selectedImageName}>{selectedImage.name}</Text>
          </>
        ) : (
          <Text style={styles.placeholderText}>Seleccionar imagen...</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.subtitle}>Elige la dificultad</Text>

      <TouchableOpacity style={styles.btn} onPress={() => startPuzzle('3x3')}>
        <Text style={styles.btnText}>3 x 3</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => startPuzzle('3x5')}>
        <Text style={styles.btnText}>3 x 5</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => startPuzzle('4x4')}>
        <Text style={styles.btnText}>4 x 4</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={() => router.push('/puzzle/rankings' as Href)}>
        <Text style={styles.btnText}>🏆 Rankings</Text>
      </TouchableOpacity>

      <Modal visible={showImageSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Imagen</Text>
            {loading ? (
              <Text style={styles.loadingText}>Cargando imágenes...</Text>
            ) : (
              <FlatList
                data={availableImages}
                renderItem={renderImageItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.imageGrid}
              />
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowImageSelector(false)}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 16, color: colors.white, opacity: 0.9, marginBottom: 16 },
  btn: { backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, marginVertical: 6, width: 220, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '700' },
  imageSelector: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: 220,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  selectedImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedImageName: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  imageGrid: {
    paddingBottom: 20,
  },
  imageItem: {
    flex: 1,
    margin: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectedImageItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  imageThumbnail: {
    width: 60,
    height: 45,
    borderRadius: 6,
    marginBottom: 8,
  },
  imageName: {
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
});
