import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors } from '@/utils/colors';
import { ImagesApi, type ColoredImage } from '@/services/images';
import { SvgUri } from 'react-native-svg';

// Mapeo de las imágenes base para mostrar en la galería
const TASK_IMAGES: Record<string, any> = {
  cat: require('../../assets/images/gato-policia-bordes.png'),
  patrol: require('../../assets/images/patrulla-bordes.png'),
  semaforo: require('../../assets/images/semaforo-bordes.png'),
};

const { width, height } = Dimensions.get('window');

export default function ImagesGallery() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromParam = params.from || 'level1'; // Por defecto nivel 1
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ColoredImage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; item: ColoredImage | null }>({ visible: false, item: null });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ImagesApi.list();
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cargar la galería');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useFocusEffect to reload when screen gains focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await ImagesApi.list();
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo refrescar');
    } finally {
      setRefreshing(false);
    }
  };

  const onDelete = (id: string) => {
    Alert.alert('Eliminar', '¿Deseas eliminar este dibujo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await ImagesApi.remove(id);
            setItems((prev) => prev.filter((x) => x.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar');
          }
        }
      }
    ]);
  };

  const showPreview = (item: ColoredImage) => {
    setPreviewModal({ visible: true, item });
  };

  const hidePreview = () => {
    setPreviewModal({ visible: false, item: null });
  };

  // Función para determinar a dónde regresar según el origen
  const getBackDestination = () => {
    switch (fromParam) {
      case 'level3':
        return '/images/index-level3';
      case 'level2':
        return '/images/index-level2';
      case 'level1':
      default:
        return '/images';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.white} />
        <Text style={{ color: colors.white, marginTop: 8 }}>Cargando galería...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace(getBackDestination() as any)}>
          <Image source={require('../../assets/images/btn-volver.png')} style={styles.backButtonImage} resizeMode="contain" />
        </TouchableOpacity>
        <Image source={require('../../assets/images/logo-pintor.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.title}> Tu Galería</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => showPreview(item)}>
            <LinearGradient colors={colors.gradientBackground} style={styles.cardInner}>
              <Text numberOfLines={2} style={styles.cardTitle}>{item.data?.title || 'Dibujo'}</Text>
              <Text style={styles.cardDate}>{new Date(item.dateCreated).toLocaleDateString()}</Text>

              {/* Display the captured image */}
              <View style={styles.drawingPreview}>
                <View style={styles.drawingContainer}>
                  {item.data?.baseImage && TASK_IMAGES[item.data.baseImage] && (
                    <Image
                      source={TASK_IMAGES[item.data.baseImage]}
                      style={styles.baseImagePreview}
                      resizeMode="contain"
                    />
                  )}

                  {(() => {
                    const mimeType = item.data?.imageMimeType;
                    const dataUrl = item.data?.imageDataUrl;
                    const isSvg = mimeType === 'image/svg+xml' || dataUrl?.startsWith('data:image/svg+xml');

                    if (isSvg && dataUrl) {
                      return (
                        <SvgUri
                          width="100%"
                          height="100%"
                          uri={dataUrl}
                          style={styles.capturedImage}
                        />
                      );
                    }

                    if (dataUrl) {
                      return (
                        <Image
                          source={{ uri: dataUrl }}
                          style={styles.capturedImage}
                          resizeMode="contain"
                        />
                      );
                    }

                    if (!item.data?.baseImage || !TASK_IMAGES[item.data.baseImage]) {
                      return <Text style={styles.noImageText}>Sin imagen</Text>;
                    }

                    return null;
                  })()}
                </View>
              </View>

              <View style={styles.cardButtons}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.buttonWarning }]} onPress={() => onDelete(item.id)}>
                  <Text style={styles.smallBtnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tienes dibujos aún.</Text>
            <TouchableOpacity style={styles.cta} onPress={() => router.push('/images/draw')}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>Crear uno ahora</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
      
      {/* Modal de vista previa */}
      <Modal
        visible={previewModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hidePreview}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {previewModal.item?.data?.title || 'Vista previa'}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={hidePreview}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {previewModal.item && (
              <View style={styles.previewContainer}>
                <View style={styles.previewImageContainer}>
                  {previewModal.item.data?.baseImage && TASK_IMAGES[previewModal.item.data.baseImage] && (
                    <Image
                      source={TASK_IMAGES[previewModal.item.data.baseImage]}
                      style={styles.previewBaseImage}
                      resizeMode="contain"
                    />
                  )}

                  {(() => {
                    const mimeType = previewModal.item.data?.imageMimeType;
                    const dataUrl = previewModal.item.data?.imageDataUrl;
                    const isSvg = mimeType === 'image/svg+xml' || dataUrl?.startsWith('data:image/svg+xml');

                    if (isSvg && dataUrl) {
                      return (
                        <SvgUri
                          width="100%"
                          height="100%"
                          uri={dataUrl}
                          style={styles.previewCapturedImage}
                        />
                      );
                    }

                    if (dataUrl) {
                      return (
                        <Image
                          source={{ uri: dataUrl }}
                          style={styles.previewCapturedImage}
                          resizeMode="contain"
                        />
                      );
                    }

                    if (!previewModal.item.data?.baseImage || !TASK_IMAGES[previewModal.item.data.baseImage]) {
                      return <Text style={styles.noImageText}>Sin imagen</Text>;
                    }

                    return null;
                  })()}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CARD_SIZE = (width - 80 - 10) / 2; // padding 40*2, gap 10

const styles = StyleSheet.create({
  container: { flex: 1, padding: 40, paddingTop: 20, backgroundColor: colors.primary },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
    position: 'relative',
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonImage: {
    width: 90,
    height: 90,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 15,
    marginTop: 10,
  },
  title: { fontSize: width < 400 ? 22 : 26, fontWeight: 'bold', color: colors.white, marginBottom: 12, textAlign: 'center', marginTop: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  card: { width: CARD_SIZE, height: CARD_SIZE + 20, borderRadius: 16, overflow: 'hidden', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  cardInner: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { color: colors.textPrimary, fontWeight: '700' },
  cardDate: { color: colors.gray, fontSize: 12 },
  drawingPreview: { flex: 1, marginVertical: 8 },
  drawingContainer: { width: '100%', height: 80, backgroundColor: 'white', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  capturedImage: { ...StyleSheet.absoluteFillObject },
  baseImagePreview: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  noImageText: { color: colors.gray, fontSize: 12 },
  pathContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pathPoint: { position: 'absolute', borderRadius: 50 },
  cardButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  smallBtnText: { color: colors.white, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: colors.white, marginBottom: 12 },
  cta: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 10, paddingHorizontal: 14 },
  ctaText: { color: colors.white, fontWeight: 'bold' },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  previewContainer: {
    padding: 20,
    alignItems: 'center',
  },
  previewImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewBaseImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  previewCapturedImage: {
    ...StyleSheet.absoluteFillObject,
  },
});
