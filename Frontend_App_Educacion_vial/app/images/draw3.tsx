import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Dimensions, PanResponder, ScrollView, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../src/utils/colors';
import { ImagesApi } from '../../src/services/images';
import { AuthService } from '../../src/services/auth';
import { awardColoringTaskLevel3Completion, maybeAwardColoringSetStarLevel3 } from '../../src/services/progress2';
import { ProgressApi } from '../../src/services/progress';

const { width, height } = Dimensions.get('window');

type TaskId = 'cat-level3' | 'patrol-level3' | 'semaforo-level3';
const TASK_IMAGES: Record<TaskId, any> = {
  'cat-level3': require('../../assets/images/gato-policia-bordes.png'),
  'patrol-level3': require('../../assets/images/patrulla-bordes.png'),
  'semaforo-level3': require('../../assets/images/semaforo-bordes.png'),
};

const COLORS = [
  '#9E9E9E','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#FF8B94','#A8E6CF','#FFB347','#000000',
  '#FF1744','#2196F3','#9C27B0','#FF9800','#009688','#795548','#607D8B','#E91E63','#3F51B5','#8BC34A',
];

export default function ImagesDraw3() {
  const router = useRouter();
  const params = useLocalSearchParams<{ task?: string }>();
  const taskParam = (params.task as TaskId) || 'cat-level3';
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [title, setTitle] = useState('Mi dibujo nivel 3');
  const [saving, setSaving] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<TaskId, boolean>>({ 'cat-level3': false, 'patrol-level3': false, 'semaforo-level3': false });
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef<View>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const pathsRef = useRef<Array<{ color: string; size: number; points: Array<{ x: number; y: number }> }>>([]);
  const lastSvgMarkupRef = useRef<string | null>(null);

  const loadCompletedTasks = useCallback(async () => {
    const initial: Record<TaskId, boolean> = { 'cat-level3': false, 'patrol-level3': false, 'semaforo-level3': false };
    try {
      const images = await ImagesApi.list();
      images.forEach((image) => {
        const baseImage = image.data?.baseImage as TaskId | undefined;
        const level = image.data?.level;
        if (baseImage && level === '3' && Object.prototype.hasOwnProperty.call(initial, baseImage)) {
          initial[baseImage] = true;
        }
      });
    } catch (error) {
      try {
        const progress = await ProgressApi.get();
        const list: string[] = Array.isArray(progress.completedGames) ? progress.completedGames : [];
        initial['cat-level3'] = list.includes('3_coloring_cat');
        initial['patrol-level3'] = list.includes('3_coloring_patrol');
        initial['semaforo-level3'] = list.includes('3_coloring_semaforo');
      } catch {}
    }
    setCompletedTasks(initial);
  }, []);

  useEffect(() => { loadCompletedTasks(); }, [loadCompletedTasks]);
  useFocusEffect(useCallback(() => { loadCompletedTasks(); }, [loadCompletedTasks]));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      if (isDrawing) return;
      setIsDrawing(true);
      const { locationX, locationY } = evt.nativeEvent;
      if (locationX >= 0 && locationY >= 0 && locationX <= width && locationY <= height) {
        const newPath = { color: selectedColor, size: brushSize, points: [{ x: locationX, y: locationY }] };
        pathsRef.current = [...pathsRef.current, newPath];
        setRenderKey(prev => prev + 1);
      } else {
        setIsDrawing(false);
      }
    },
    onPanResponderMove: (evt) => {
      if (!isDrawing) return;
      const { locationX, locationY } = evt.nativeEvent;
      if (locationX >= 0 && locationY >= 0 && locationX <= width && locationY <= height) {
        const currentPath = pathsRef.current[pathsRef.current.length - 1];
        if (currentPath) {
          currentPath.points.push({ x: locationX, y: locationY });
          setRenderKey(prev => prev + 1);
        }
      }
    },
    onPanResponderRelease: () => { setIsDrawing(false); },
    onPanResponderTerminate: () => { setIsDrawing(false); },
  });

  const clearCanvas = () => { pathsRef.current = []; setRenderKey(prev => prev + 1); };
  const undoLast = () => {
    if (pathsRef.current.length > 0) {
      const lastPath = pathsRef.current[pathsRef.current.length - 1];
      if (lastPath.color === selectedColor && lastPath.points.length > 0) {
        lastPath.points.pop();
        setRenderKey(prev => prev + 1);
        if (lastPath.points.length === 0) pathsRef.current = pathsRef.current.slice(0, -1);
      } else {
        pathsRef.current = pathsRef.current.slice(0, -1);
      }
      setRenderKey(prev => prev + 1);
    }
  };

  const captureCanvasImage = async (): Promise<string | null> => {
    if (!canvasRef.current) return null;
    try {
      const base64 = await captureRef(canvasRef, { format: 'png', quality: 0.9, result: 'base64' });
      if (!base64) return null;
      return `data:image/png;base64,${base64}`;
    } catch { return null; }
  };

  const createFallbackImage = async (): Promise<string> => {
    const svgWidth = 400; const svgHeight = 400;
    let svgPaths = '';
    pathsRef.current.forEach((path) => {
      if (path.points.length > 0) {
        let pathData = `M ${path.points[0].x} ${path.points[0].y}`;
        for (let i = 1; i < path.points.length; i++) { pathData += ` L ${path.points[i].x} ${path.points[i].y}`; }
        svgPaths += `<path d="${pathData}" stroke="${path.color}" stroke-width="${path.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    });
    const svgContent = `
      <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${svgPaths}
        <text x="10" y="${svgHeight - 10}" font-family="Arial" font-size="12" fill="#999">
          ${taskParam} nivel 3 - ${pathsRef.current.length} trazos
        </text>
      </svg>
    `;
    lastSvgMarkupRef.current = svgContent;
    const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
    return `data:image/svg+xml;base64,${svgBase64}`;
  };

  const onSave = async () => {
    try {
      setSaving(true);
      if (!pathsRef.current || pathsRef.current.length === 0) { Alert.alert('Error', 'No hay dibujo para guardar.'); return; }
      if (!imageLoaded) { Alert.alert('Espera', 'La imagen base aún se está cargando.'); return; }

      let capturedImageUri = await captureCanvasImage();
      if (!capturedImageUri) {
        try { capturedImageUri = await createFallbackImage(); } catch { capturedImageUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; }
      }
      if (!capturedImageUri) { Alert.alert('Error', 'No se pudo generar la imagen.'); return; }

      const formData = new FormData();
      const isSvgImage = capturedImageUri.startsWith('data:image/svg+xml');
      const mimeType = isSvgImage ? 'image/svg+xml' : 'image/png';
      const fileExtension = isSvgImage ? 'svg' : 'png';
      const fileNameBase = title.trim() || 'Dibujo';
      const imageFile = { uri: capturedImageUri, type: mimeType, name: `${fileNameBase}_${Date.now()}.${fileExtension}` } as any;

      formData.append('image', imageFile);
      formData.append('title', title.trim() || 'Mi Dibujo Nivel 3');
      formData.append('description', `Dibujo coloreado de ${taskParam} - Nivel 3`);
      formData.append('taskId', taskParam);
      formData.append('baseImage', taskParam);
      formData.append('category', 'educational');
      formData.append('type', 'coloring');
      formData.append('level', '3');
      formData.append('status', 'completed');
      formData.append('imageMimeType', mimeType);
      formData.append('imageFileName', imageFile.name);
      if (capturedImageUri.startsWith('data:')) formData.append('imageDataUrl', capturedImageUri);
      if (isSvgImage && lastSvgMarkupRef.current) formData.append('imageSvgMarkup', lastSvgMarkupRef.current);
      formData.append('paths', JSON.stringify(pathsRef.current));
      formData.append('colors', JSON.stringify([...new Set(pathsRef.current.map(path => path.color))]));
      formData.append('metadata', JSON.stringify({ totalPaths: pathsRef.current.length, totalPoints: pathsRef.current.reduce((sum, path) => sum + path.points.length, 0), taskParam, timestamp: Date.now(), version: '3.0' }));

      try {
        const { accessToken, childId } = await AuthService.getSession();
        if (!accessToken || !childId) throw new Error('No session');
        const baseUrl = 'http://192.168.100.159:3002';
        const url = `${baseUrl}/images/${childId}`;
        await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData });

        const levelBaseTaskId = taskParam.replace('-level3', '') as 'cat' | 'patrol' | 'semaforo';
        await awardColoringTaskLevel3Completion(levelBaseTaskId, 10);
        setCompletedTasks(prev => ({ ...prev, [taskParam]: true }));
        await maybeAwardColoringSetStarLevel3();
        Alert.alert('¡Guardado!', 'Tu dibujo del Nivel 3 se ha guardado y se registró tu progreso.', [
          { text: 'Ir a Galería', onPress: () => router.push('/images/gallery?from=level3') },
        ]);
      } catch (serverError: any) {
        Alert.alert('Error', serverError?.message || 'No se pudo guardar');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Error desconocido');
    } finally { setSaving(false); }
  };

  const getTaskInfo = (taskId: TaskId) => {
    const taskMap: Record<TaskId, { title: string; emoji: string }> = {
      'cat-level3': { title: 'Gato Policía Nivel 3', emoji: '🐱' },
      'patrol-level3': { title: 'Patrulla Nivel 3', emoji: '🚓' },
      'semaforo-level3': { title: 'Semáforo Nivel 3', emoji: '🚦' },
    };
    return taskMap[taskId] || taskMap['cat-level3'];
  };

  const taskInfo = getTaskInfo(taskParam);

  return (
    <ImageBackground source={require('../../assets/images/fondo-draw.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/images/index-level3' as Href)} style={styles.backBtn} activeOpacity={0.85}>
          <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.title}>{taskInfo.emoji} {taskInfo.title}</Text>
        <Text style={styles.subtitle}>¡Colorea y diviértete en el Nivel 3!</Text>
        <View style={styles.starsContainer}>
          <StarsRow completed={completedTasks} />
        </View>
      </View>

      <View style={styles.canvasContainer}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.8 }} style={{ backgroundColor: 'white' }}>
          <View ref={canvasRef} style={styles.canvas} {...panResponder.panHandlers}>
            <Image source={TASK_IMAGES[taskParam]} style={styles.baseImage} resizeMode="contain" onLoad={() => setImageLoaded(true)} onError={() => setImageLoaded(false)} />
            <Svg style={styles.svgOverlay}>
              {pathsRef.current.map((path, index) => {
                const pts = path.points;
                if (!pts || pts.length === 0) return null;
                if (pts.length === 1) {
                  const p = pts[0];
                  return (
                    <Path key={`${index}-${renderKey}`} d={`M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`} stroke={path.color} strokeWidth={path.size} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  );
                }
                const commands: string[] = [];
                commands.push(`M ${pts[0].x} ${pts[0].y}`);
                for (let i = 1; i < pts.length - 1; i++) {
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const nx = (p1.x + p2.x) / 2;
                  const ny = (p1.y + p2.y) / 2;
                  commands.push(`Q ${p1.x} ${p1.y} ${nx} ${ny}`);
                }
                if (pts.length === 2) commands.splice(1, commands.length, `L ${pts[1].x} ${pts[1].y}`);
                const d = commands.join(' ');
                return (<Path key={`${index}-${renderKey}`} d={d} stroke={path.color} strokeWidth={path.size} strokeLinecap="round" strokeLinejoin="round" fill="none" />);
              })}
            </Svg>
            {imageLoaded && !saving && (
              <View style={styles.overlayContainer} pointerEvents="none">
                <Image source={TASK_IMAGES[taskParam]} style={styles.overlayImage} resizeMode="contain" />
              </View>
            )}
          </View>
        </ViewShot>
      </View>

      <ScrollView style={styles.toolsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Colores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsContainer}>
            {COLORS.map((color, index) => (
              <TouchableOpacity key={index} style={[styles.colorButton, { backgroundColor: color }, selectedColor === color && styles.selectedColor]} onPress={() => setSelectedColor(color)} />
            ))}
          </ScrollView>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Tamaño del Pincel</Text>
          <View style={styles.brushSizes}>
            {[4, 8, 12, 16, 20].map((size) => (
              <TouchableOpacity key={size} style={[styles.brushSize, { width: size * 2, height: size * 2 }, brushSize === size && styles.selectedBrushSize]} onPress={() => setBrushSize(size)} />
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Título</Text>
          <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="Mi dibujo genial nivel 3" placeholderTextColor={colors.gray} />
        </View>
      </ScrollView>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.toolButton} onPress={undoLast}><Text style={styles.toolButtonText}>↶</Text></TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={clearCanvas}><Text style={styles.toolButtonText}>🗑️</Text></TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.saveBtn, { opacity: saving ? 0.5 : 1 }]} onPress={onSave} disabled={saving} activeOpacity={0.85}>
        <Image source={require('../../assets/images/btn-guardar.png')} style={styles.saveImg} resizeMode="contain" />
      </TouchableOpacity>
    </ImageBackground>
  );
}

function StarsRow({ completed }: { completed: Record<'cat-level3' | 'patrol-level3' | 'semaforo-level3', boolean> }) {
  const count = (completed['cat-level3'] ? 1 : 0) + (completed['patrol-level3'] ? 1 : 0) + (completed['semaforo-level3'] ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 6, marginVertical: 6 }}>
      {[1, 2, 3].map((i) => (
        <Text key={i} style={{ fontSize: 20 }}>{i <= count ? '⭐' : '☆'}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, paddingTop: 50 },
  header: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, position: 'relative' },
  backBtn: { position: 'absolute', top: 0, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  starsContainer: { marginTop: 8 },
  title: { fontSize: width < 400 ? 24 : 28, fontWeight: 'bold', color: colors.white, textAlign: 'center', marginBottom: 0 },
  subtitle: { fontSize: width < 400 ? 14 : 16, color: colors.white, opacity: 0.9, textAlign: 'center' },
  canvasContainer: { flex: 1, marginHorizontal: 20, marginBottom: 10 },
  canvas: { flex: 1, backgroundColor: 'white', borderRadius: 16, position: 'relative', overflow: 'hidden', minHeight: 300 },
  baseImage: { width: '100%', height: '100%', position: 'absolute', zIndex: 1 },
  svgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 },
  toolsContainer: { maxHeight: height * 0.3, marginHorizontal: 20, marginBottom: 10 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.white, marginBottom: 6, marginTop: 4 },
  colorsContainer: { flexDirection: 'row' },
  colorButton: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  selectedColor: { borderColor: colors.white, borderWidth: 3 },
  brushSizes: { flexDirection: 'row', alignItems: 'center' },
  brushSize: { backgroundColor: colors.white, borderRadius: 50, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  selectedBrushSize: { borderColor: colors.accent, borderWidth: 3 },
  titleInput: { backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 16 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', marginHorizontal: 20, marginBottom: 10 },
  toolButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  toolButtonText: { fontSize: 20, color: colors.white },
  saveBtn: { borderRadius: 16, overflow: 'hidden', marginHorizontal: 20, marginBottom: 20 },
  saveImg: { width: '100%', height: 80 },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  overlayImage: { width: '100%', height: '100%', opacity: 0.8 },
});


