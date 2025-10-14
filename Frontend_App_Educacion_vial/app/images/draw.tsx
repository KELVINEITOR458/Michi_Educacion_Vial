import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Dimensions, PanResponder, ScrollView, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../src/utils/colors';
import { ImagesApi } from '../../src/services/images';
import { AuthService } from '../../src/services/auth';
import { awardColoringTaskCompletion, maybeAwardColoringSetStar } from '../../src/services/progress2';
import { ProgressApi } from '../../src/services/progress';
const { width, height } = Dimensions.get('window');
type TaskId = 'cat' | 'patrol' | 'semaforo';
const TASK_IMAGES: Record<TaskId, any> = {
  cat: require('../../assets/images/gato-policia-bordes.png'), // ✅ Gato policía con bordes
  patrol: require('../../assets/images/patrulla-bordes.png'),   // ✅ Patrulla con bordes
  semaforo: require('../../assets/images/semaforo-bordes.png'), // ✅ Semáforo con bordes
};
const COLORS = [
  '#9E9E9E', // Gris
  '#FF6B6B', // Rojo
  '#4ECDC4', // Turquesa
  '#45B7D1', // Azul
  '#96CEB4', // Verde
  '#FFEAA7', // Amarillo
  '#DDA0DD', // Morado
  '#FF8B94', // Rosa
  '#A8E6CF', // Verde menta
  '#FFB347', // Naranja
  '#000000', // Negro
  '#FF1744', // Rojo brillante
  '#2196F3', // Azul eléctrico
  '#9C27B0', // Púrpura
  '#FF9800', // Naranja vibrante
  '#009688', // Verde azulado
  '#795548', // Café
  '#607D8B', // Gris azulado
  '#E91E63', // Rosa intenso
  '#3F51B5', // Índigo
  '#8BC34A', // Verde lima
];
export default function ImagesDraw() {
  const router = useRouter();
  const params = useLocalSearchParams<{ task?: string }>();
  const taskParam = (params.task as TaskId) || 'cat';
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [title, setTitle] = useState('Mi dibujo');
  const [saving, setSaving] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // ✅ Forzar re-renderizado
  const [isDrawing, setIsDrawing] = useState(false); // ✅ Evitar dibujo automático
  const [completedTasks, setCompletedTasks] = useState<Record<TaskId, boolean>>({ cat: false, patrol: false, semaforo: false }); // ✅ Estado de tareas completadas
  const [imageLoaded, setImageLoaded] = useState(false); // ✅ Estado de carga de imagen base
  const canvasRef = useRef<View>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const pathsRef = useRef<Array<{ color: string; size: number; points: Array<{ x: number; y: number }> }>>([]);
  const lastSvgMarkupRef = useRef<string | null>(null);
  // ✅ Cargar estado de tareas completadas al iniciar
  const loadCompletedTasks = useCallback(async () => {
    const initial: Record<TaskId, boolean> = { cat: false, patrol: false, semaforo: false };

    try {
      const images = await ImagesApi.list();

      images.forEach((image) => {
        const baseImage = image.data?.baseImage as TaskId | undefined;
        if (baseImage && Object.prototype.hasOwnProperty.call(initial, baseImage)) {
          initial[baseImage] = true;
        }
      });
    } catch (error) {
      try {
        const progress = await ProgressApi.get();
        const list: string[] = Array.isArray(progress.completedGames) ? progress.completedGames : [];
        initial.cat = list.includes('1_coloring_cat');
        initial.patrol = list.includes('1_coloring_patrol');
        initial.semaforo = list.includes('1_coloring_semaforo');
      } catch (_progressError) {
        // Ignorar
      }
    }

    setCompletedTasks(initial);
  }, []);

  useEffect(() => {
    loadCompletedTasks();
  }, [loadCompletedTasks]);

  useFocusEffect(
    useCallback(() => {
      loadCompletedTasks();
    }, [loadCompletedTasks])
  );
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      if (isDrawing) return; // ✅ Evitar múltiples trazos simultáneos
      setIsDrawing(true); // ✅ Marcar que estamos dibujando
      const { locationX, locationY } = evt.nativeEvent;
      // ✅ Validar coordenadas y crear trazo solo si son válidas
      if (locationX >= 0 && locationY >= 0 && locationX <= width && locationY <= height) {
        const newPath = {
          color: selectedColor,
          size: brushSize,
          points: [{ x: locationX, y: locationY }]
        };
        pathsRef.current = [...pathsRef.current, newPath];
        setRenderKey(prev => prev + 1); // ✅ Forzar re-renderizado
      } else {
        setIsDrawing(false); // ✅ No dibujar si está fuera del área
      }
    },
    onPanResponderMove: (evt) => {
      if (!isDrawing) return; // ✅ Solo permitir movimiento si estamos dibujando
      const { locationX, locationY } = evt.nativeEvent;
      // ✅ Validar que las coordenadas estén dentro del canvas
      if (locationX >= 0 && locationY >= 0 && locationX <= width && locationY <= height) {
        const currentPath = pathsRef.current[pathsRef.current.length - 1];
        if (currentPath) {
          // Umbral dinámico según grosor para reducir puntos y mejorar rendimiento
          const last = currentPath.points[currentPath.points.length - 1];
          const dx = locationX - last.x;
          const dy = locationY - last.y;
          const minDist = Math.max(2, brushSize * 0.6);
          if ((dx * dx + dy * dy) > (minDist * minDist)) {
            currentPath.points.push({ x: locationX, y: locationY });
            // Limitar tamaño por trazo para no degradar el rendimiento
            const MAX_POINTS_PER_PATH = 1500;
            if (currentPath.points.length > MAX_POINTS_PER_PATH) {
              // Downsample conservando 1 de cada 2 puntos
              currentPath.points = currentPath.points.filter((_, i) => i % 2 === 0);
            }
          }
          // Agrupar repintados a un frame usando requestAnimationFrame
          if (!(onSave as any)._rafScheduled) {
            (onSave as any)._rafScheduled = true;
            requestAnimationFrame(() => {
              (onSave as any)._rafScheduled = false;
              setRenderKey(prev => prev + 1);
            });
          }
        }
      }
    },
    onPanResponderRelease: () => {
      setIsDrawing(false); // ✅ Terminar dibujo
    },
    onPanResponderTerminate: () => {
      setIsDrawing(false); // ✅ Terminar dibujo si se interrumpe
    },
  });
  const clearCanvas = () => {
    pathsRef.current = []; // ✅ Limpiar automáticamente sin confirmación
    setRenderKey(prev => prev + 1); // ✅ Forzar re-renderizado
  };
  const undoLast = () => {
    if (pathsRef.current.length > 0) {
      const lastPath = pathsRef.current[pathsRef.current.length - 1];
      // ✅ Si el último trazo tiene el color seleccionado, eliminar el último punto
      if (lastPath.color === selectedColor && lastPath.points.length > 0) {
        lastPath.points.pop();
        setRenderKey(prev => prev + 1); // ✅ Actualizar en tiempo real
        // ✅ Si no quedan puntos en el último trazo, eliminar el trazo completo
        if (lastPath.points.length === 0) {
          pathsRef.current = pathsRef.current.slice(0, -1);
        }
      } else {
        // ✅ Si no es del color seleccionado, eliminar el último trazo completo
        pathsRef.current = pathsRef.current.slice(0, -1);
      }
      setRenderKey(prev => prev + 1); // ✅ Forzar re-renderizado
    }
  };
  // ✅ Función de respaldo mejorada - crear imagen SVG con los trazos
  const captureCanvasImage = async (): Promise<string | null> => {
    if (!canvasRef.current) {
      return null;
    }
    try {
      const base64 = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
        result: 'base64',
      });
      if (!base64) return null;
      return `data:image/png;base64,${base64}`;
    } catch (_error) {
      return null;
    }
  };
  const createFallbackImage = async (): Promise<string> => {
    // Crear un SVG que represente visualmente el dibujo
    const svgWidth = 400;
    const svgHeight = 400;
    // Crear los paths SVG para cada trazo
    let svgPaths = '';
    pathsRef.current.forEach((path, pathIndex) => {
      if (path.points.length > 0) {
        // Crear un path SVG para este trazo
        let pathData = `M ${path.points[0].x} ${path.points[0].y}`;
        // Agregar todos los puntos del trazo
        for (let i = 1; i < path.points.length; i++) {
          pathData += ` L ${path.points[i].x} ${path.points[i].y}`;
        }
        // Agregar el path al SVG
        svgPaths += `<path d="${pathData}" stroke="${path.color}" stroke-width="${path.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    });
    // Crear el SVG completo
    const svgContent = `
      <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${svgPaths}
        <text x="10" y="${svgHeight - 10}" font-family="Arial" font-size="12" fill="#999">
          ${taskParam} - ${pathsRef.current.length} trazos
        </text>
      </svg>
    `;
    lastSvgMarkupRef.current = svgContent;
    // Convertir SVG a base64
    const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    return dataUrl;
  };
  const onSave = async () => {
    try {
      setSaving(true);
      if (!pathsRef.current || pathsRef.current.length === 0) {
        Alert.alert('Error', 'No hay dibujo para guardar. Dibuja algo primero.');
        return;
      }
      if (!imageLoaded) {
        Alert.alert('Espera', 'La imagen base aún se está cargando. Espera unos segundos e intenta de nuevo.');
        return;
      }
      let capturedImageUri = await captureCanvasImage();
      if (!capturedImageUri) {
        try {
          capturedImageUri = await createFallbackImage();
        } catch (fallbackError) {
          Alert.alert('Error de Captura', 'No se pudo crear la imagen del dibujo.\n\nEl dibujo se guardará pero sin imagen visual.');
          capturedImageUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        }
      }
      if (!capturedImageUri) {
        Alert.alert('Error', 'No se pudo generar la imagen. Intenta de nuevo.');
        return;
      }
      // Crear un FormData para enviar la imagen
      const formData = new FormData();
      const isSvgImage = capturedImageUri.startsWith('data:image/svg+xml');
      const mimeType = isSvgImage ? 'image/svg+xml' : 'image/png';
      const fileExtension = isSvgImage ? 'svg' : 'png';
      const fileNameBase = title.trim() || 'Dibujo';
      const imageFile = {
        uri: capturedImageUri,
        type: mimeType,
        name: `${fileNameBase}_${Date.now()}.${fileExtension}`,
      } as any;
      // Campos básicos requeridos por el backend
      formData.append('image', imageFile);
      formData.append('title', title.trim() || 'Mi Dibujo');
      formData.append('description', `Dibujo coloreado de ${taskParam}`);
      // Campos específicos que el backend REQUIERE
      formData.append('taskId', taskParam);
      formData.append('baseImage', taskParam);
      formData.append('category', 'educational');
      formData.append('type', 'coloring');
      formData.append('level', '1');
      formData.append('status', 'completed');
      // Metadatos de la imagen
      formData.append('imageMimeType', mimeType);
      formData.append('imageFileName', imageFile.name);
      if (capturedImageUri.startsWith('data:')) {
        formData.append('imageDataUrl', capturedImageUri);
      }
      if (isSvgImage && lastSvgMarkupRef.current) {
        formData.append('imageSvgMarkup', lastSvgMarkupRef.current);
      }
      // ✅ CAMPOS REQUERIDOS POR EL BACKEND (línea 24 del service)
      formData.append('paths', JSON.stringify(pathsRef.current));
      formData.append('colors', JSON.stringify([...new Set(pathsRef.current.map(path => path.color))]));
      // Información adicional del dibujo
      formData.append('metadata', JSON.stringify({
        totalPaths: pathsRef.current.length,
        totalPoints: pathsRef.current.reduce((sum, path) => sum + path.points.length, 0),
        taskParam,
        timestamp: Date.now(),
        version: '1.0'
      }));
      try {
        const { accessToken, childId } = await AuthService.getSession();
        if (!accessToken || !childId) throw new Error('No session');
        // En React Native, usar API_BASE_URL configurado en app.json; fallback al DEFAULT_BASE_URL de ApiClient
        const configured = (require('expo-constants').default.expoConfig?.extra?.API_BASE_URL as string) || undefined;
        const { ApiClient } = require('../../src/services/api');
        const baseUrl = configured || new ApiClient().request ? (new ApiClient() as any).baseUrl || 'http://192.168.100.22:3002' : 'http://192.168.100.22:3002';
        const url = `${baseUrl}/images/${childId}`;
        // Primero verificar si el servidor está disponible
        try {
          const healthCheck = await Promise.race([
            fetch(`${baseUrl}/health`, { method: 'GET' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
          ]);
        } catch (healthError) {
        }

        // Usar Promise.race para implementar timeout manual
        const response = await Promise.race([
          fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              // No especificar Content-Type para FormData - React Native lo maneja automáticamente
            },
            body: formData,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
          )
        ]) as Response;
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const result = await response.json();
        // ✅ Marcar progreso después de guardar exitosamente
        await awardColoringTaskCompletion(taskParam, 8);
        setCompletedTasks(prev => ({ ...prev, [taskParam]: true }));
        await maybeAwardColoringSetStar();
        Alert.alert('¡Guardado!', 'Tu dibujo se ha guardado y se registró tu progreso.', [
          { text: 'Ir a Galería', onPress: () => router.push('/images/gallery') },
        ]);
      } catch (serverError: any) {
        // Show user-friendly error message
        let errorMessage = 'Error interno del servidor';
        let showOfflineOption = false;
        if (serverError?.message?.includes('Network request failed') || 
            serverError?.message?.includes('fetch') ||
            serverError?.message?.includes('ECONNREFUSED')) {
          errorMessage = 'No se puede conectar al servidor.\n\n¿Quieres guardar localmente por ahora?';
          showOfflineOption = true;
        } else if (serverError?.message?.includes('401')) {
          errorMessage = 'Error de autenticación. Intenta reiniciar la aplicación.';
        } else if (serverError?.message?.includes('500')) {
          errorMessage = 'Error interno del servidor. Contacta al administrador.';
        } else if (serverError?.message) {
          errorMessage = serverError.message;
        }
        if (showOfflineOption) {
          Alert.alert('Servidor No Disponible', errorMessage, [
            {
              text: 'Guardar Localmente',
              onPress: async () => {
                try {
                  // Guardar progreso localmente
                  await awardColoringTaskCompletion(taskParam, 8);
                  setCompletedTasks(prev => ({ ...prev, [taskParam]: true }));
                  await maybeAwardColoringSetStar();
                  Alert.alert('¡Guardado Localmente!', 'Tu progreso se ha guardado en el dispositivo.\n\nCuando el servidor esté disponible, podrás sincronizar tus dibujos.', [
                    { text: 'OK' },
                  ]);
                } catch (localError) {
                  Alert.alert('Error', 'No se pudo guardar ni local ni remotamente.');
                }
              }
            },
            {
              text: 'Reintentar',
              onPress: () => {
                // El usuario puede intentar de nuevo
              }
            },
            {
              text: 'Cancelar',
              style: 'cancel'
            }
          ]);
        } else {
          Alert.alert('Error al Guardar', errorMessage);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', `Error inesperado: ${e?.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };
  const getTaskInfo = (taskId: TaskId) => {
    const taskMap: Record<TaskId, { title: string; emoji: string }> = {
      cat: { title: 'Gato Policía', emoji: '🐱' },
      patrol: { title: 'Patrulla', emoji: '🚓' },
      semaforo: { title: 'Semáforo', emoji: '🚦' },
    };
    return taskMap[taskId] || taskMap.cat;
  };
  const taskInfo = getTaskInfo(taskParam);
  return (
    <ImageBackground source={require('../../assets/images/fondo-draw.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/images' as Href)} style={styles.backBtn} activeOpacity={0.85}>
          <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.title}>{taskInfo.emoji} {taskInfo.title}</Text>
      </View>
      {/* Canvas Area */}
      <View style={styles.canvasContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ 
            format: 'png', 
            quality: 0.8
          }}
          style={{ backgroundColor: 'white' }}
        >
          <View
            ref={canvasRef}
            style={styles.canvas}
            {...panResponder.panHandlers}
          >
            {/* Base Image - DEBAJO de los trazos como fondo */}
            <Image
              source={TASK_IMAGES[taskParam]}
              style={styles.baseImage}
              resizeMode="contain"
              onLoad={() => {
                setImageLoaded(true);
              }}
              onError={() => {
                setImageLoaded(false);
              }}
            />
            {/* Drawing Paths - Trazos continuos con SVG */}
            <Svg style={styles.svgOverlay}>
              {pathsRef.current.map((path, index) => {
                const pts = path.points;
                if (!pts || pts.length === 0) return null;
                if (pts.length === 1) {
                  const p = pts[0];
                  return (
                    <Path key={`${index}-${renderKey}`}
                      d={`M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`}
                      stroke={path.color}
                      strokeWidth={path.size}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  );
                }
                // Curvas Bézier cuadráticas suaves (Q / T)
                // Genera puntos intermedios usando midpoints para suavizar
                const commands: string[] = [];
                commands.push(`M ${pts[0].x} ${pts[0].y}`);
                for (let i = 1; i < pts.length - 1; i++) {
                  const p0 = pts[i - 1];
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const cx = (p0.x + p1.x) / 2;
                  const cy = (p0.y + p1.y) / 2;
                  const nx = (p1.x + p2.x) / 2;
                  const ny = (p1.y + p2.y) / 2;
                  commands.push(`Q ${p1.x} ${p1.y} ${nx} ${ny}`);
                }
                // Línea final al último punto si solo hay 2
                if (pts.length === 2) {
                  commands.splice(1, commands.length, `L ${pts[1].x} ${pts[1].y}`);
                }
                const d = commands.join(' ');
                return (
                  <Path
                    key={`${index}-${renderKey}`}
                    d={d}
                    stroke={path.color}
                    strokeWidth={path.size}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                );
              })}
            </Svg>
            {/* Overlay Image - ENCIMA de los trazos para mantener bordes visibles */}
            {imageLoaded && !saving && (
              <View style={styles.overlayContainer} pointerEvents="none">
                <Image
                  source={TASK_IMAGES[taskParam]}
                  style={styles.overlayImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </ViewShot>
      </View>
      {/* Tools Panel - SIEMPRE VISIBLE */}
      <ScrollView style={styles.toolsContainer} showsVerticalScrollIndicator={false}>
        {/* Color Palette */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Colores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsContainer}>
            {COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>
        </View>
        {/* Brush Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Tamaño del Pincel</Text>
          <View style={styles.brushSizes}>
            {[4, 8, 12, 16, 20].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.brushSize,
                  { width: size * 2, height: size * 2 },
                  brushSize === size && styles.selectedBrushSize
                ]}
                onPress={() => setBrushSize(size)}
              />
            ))}
          </View>
        </View>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Título</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Mi dibujo genial"
            placeholderTextColor={colors.gray}
          />
        </View>
      </ScrollView>
      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.toolButton} onPress={undoLast}>
          <Text style={styles.toolButtonText}>↶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={clearCanvas}>
          <Text style={styles.toolButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      {/* Save Button */}
      <TouchableOpacity style={[styles.saveBtn, { opacity: saving ? 0.5 : 1 }]} onPress={onSave} disabled={saving} activeOpacity={0.85}>
        <Image source={require('../../assets/images/btn-guardar.png')} style={styles.saveImg} resizeMode="contain" />
      </TouchableOpacity>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtn: { position: 'absolute', top: -30, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  backButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: width < 400 ? 24 : 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 30
  },
  subtitle: {
    fontSize: width < 400 ? 14 : 16,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  canvasContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  canvas: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 300, // Asegurar altura mínima
  },
  baseImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 1, // ✅ Imagen base DEBAJO de los trazos
  },
  pathContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // ✅ Trazos ENCIMA de la imagen base
  },
  pathPoint: {
    position: 'absolute',
    borderRadius: 50,
  },
  toolsContainer: {
    maxHeight: height * 0.3,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 6,
    marginTop:4,
  },
  colorsContainer: {
    flexDirection: 'row',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: colors.white,
    borderWidth: 3,
  },
  brushSizes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brushSize: {
    backgroundColor: colors.white,
    borderRadius: 50,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBrushSize: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  titleInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  toolButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  toolButtonText: {
    fontSize: 20,
    color: colors.white,
  },
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  saveImg: {
    width: '100%',
    height: 80,
  },
  // Estilos para overlay de bordes
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20, // ENCIMA de todo para mantener bordes visibles
  },
  overlayImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8, // Semi-transparente para no ocultar completamente los colores
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
});

