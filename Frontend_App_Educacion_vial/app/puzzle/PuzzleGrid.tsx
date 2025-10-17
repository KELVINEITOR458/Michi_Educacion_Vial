import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Piece {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  correctX: number;
  correctY: number;
  fixed: boolean;
  translateX: number;
  translateY: number;
}

interface PuzzleGridProps {
  imageSource: { uri: string } | number;
  gridSize: number;
  showPreview?: boolean;
  tiles?: Array<{ url: string; row: number; col: number }>; // piezas pre-cortadas del backend
  onPieceUpdate?: (id: number, x: number, y: number, fixed: boolean) => void;
  onComplete?: () => void;
}

export default function PuzzleGrid({
  imageSource,
  gridSize,
  showPreview = true,
  tiles,
  onPieceUpdate,
  onComplete
}: PuzzleGridProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [completed, setCompleted] = useState(false);

  // Tamaño del puzzle (cuadrado) - más pequeño para dejar espacio abajo
  const puzzleSize = Math.min(width - 40, 280);
  const pieceSize = puzzleSize / gridSize;

  useEffect(() => {
    if (imageSource) {
      generatePieces();
    }
  }, [gridSize, puzzleSize, imageSource, tiles]);

  const generatePieces = () => {
    const arr: Piece[] = [];
    let id = 0;

    // Crear todas las piezas con sus posiciones correctas
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const correctX = col * pieceSize;
        const correctY = row * pieceSize;

        arr.push({
          id,
          row,
          col,
          x: correctX,
          y: correctY,
          correctX,
          correctY,
          fixed: false,
          translateX: 0,
          translateY: 0
        });
        id++;
      }
    }

    // Si tenemos tiles del backend, usar generación local
    if (!tiles || tiles.length === 0) {
      // Mezclar posiciones iniciales - todas van al área flotante debajo
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      // Calcular posiciones en el área flotante (3 columnas para mejor distribución)
      const piecesPerRow = 3;
      arr.forEach((piece, index) => {
        const row = Math.floor(index / piecesPerRow);
        const col = index % piecesPerRow;
        piece.x = col * pieceSize + 20; // Espaciado de 20px
        piece.y = puzzleSize + 20 + row * pieceSize; // Debajo del puzzle con espaciado
        piece.translateX = 0;
        piece.translateY = 0;
      });
    } else {
      // Usar posiciones iniciales mezcladas pero con tiles del backend
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      // Posicionar en área flotante
      const piecesPerRow = 3;
      arr.forEach((piece, index) => {
        const row = Math.floor(index / piecesPerRow);
        const col = index % piecesPerRow;
        piece.x = col * pieceSize + 20;
        piece.y = puzzleSize + 20 + row * pieceSize;
      });
    }

    setPieces(arr);
    setCompleted(false);
  };

  const checkCompletion = () => {
    const allFixed = pieces.every(p => p.fixed);
    if (allFixed && !completed) {
      setCompleted(true);
      onComplete?.();
    }
  };

  const handlePieceUpdate = (id: number, x: number, y: number, fixed: boolean) => {
    setPieces(prev => prev.map(p =>
      p.id === id ? { ...p, x, y, fixed } : p
    ));
    onPieceUpdate?.(id, x, y, fixed);
    if (fixed) {
      setTimeout(checkCompletion, 100);
    }
  };

  const handlePieceSwap = (pieceId: number, targetX: number, targetY: number) => {
    setPieces(prev => {
      const newPieces = [...prev];
      const piece = newPieces.find(p => p.id === pieceId);
      const pieceInTarget = newPieces.find(p => p.x === targetX && p.y === targetY && p.id !== pieceId);
      
      if (piece) {
        // Guardar posición anterior
        const oldX = piece.x;
        const oldY = piece.y;
        
        // Mover pieza a nueva posición
        piece.x = targetX;
        piece.y = targetY;
        piece.translateX = targetX;
        piece.translateY = targetY;
        
        // Si hay otra pieza en la posición objetivo, moverla a la posición anterior
        if (pieceInTarget) {
          pieceInTarget.x = oldX;
          pieceInTarget.y = oldY;
          pieceInTarget.translateX = oldX;
          pieceInTarget.translateY = oldY;
        }
      }
      
      return newPieces;
    });
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Área del puzzle */}
      <View style={[styles.puzzleContainer, { width: puzzleSize, height: puzzleSize }]}>
        {/* Vista previa de la imagen completa */}
        {showPreview && (
          <Image
            source={imageSource}
            style={[styles.previewImage, { width: puzzleSize, height: puzzleSize }]}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Renderizar todas las piezas */}
      {pieces.length > 0 && pieces.map((piece) => (
        <PuzzlePiece
          key={`piece-${piece.id}`}
          piece={piece}
          imageSource={imageSource}
          pieceSize={pieceSize}
          gridSize={gridSize}
          puzzleSize={puzzleSize}
          onUpdate={handlePieceUpdate}
          useIndividualTile={!!tiles}
        />
      ))}

      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Pieces: {pieces.length} | Grid: {gridSize}x{gridSize}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

function PuzzlePiece({
  piece,
  imageSource,
  pieceSize,
  gridSize,
  puzzleSize,
  onUpdate,
  useIndividualTile = false
}: {
  piece: Piece;
  imageSource: { uri: string } | number;
  pieceSize: number;
  gridSize: number;
  puzzleSize: number;
  onUpdate: (id: number, x: number, y: number, fixed: boolean) => void;
  useIndividualTile?: boolean;
}) {
  const translateX = useSharedValue(piece.x);
  const translateY = useSharedValue(piece.y);

  const gesture = Gesture.Pan()
    .onChange((e) => {
      if (piece.fixed) return;

      // Permitir movimiento libre dentro de límites amplios
      const maxX = width - pieceSize - 20;
      const maxY = puzzleSize + 140 + pieceSize;

      translateX.value = Math.max(0, Math.min(maxX, translateX.value + e.changeX));
      translateY.value = Math.max(0, Math.min(maxY, translateY.value + e.changeY));
    })
    .onEnd(() => {
      if (piece.fixed) return;

      // Calcular distancia a la posición correcta
      const currentX = translateX.value;
      const currentY = translateY.value;
      const dx = Math.abs(currentX - piece.correctX);
      const dy = Math.abs(currentY - piece.correctY);
      const snap = pieceSize * 0.3; // 30% de tolerancia para mejor experiencia

      if (dx < snap && dy < snap) {
        // Encajar en posición correcta con animación
        translateX.value = withTiming(piece.correctX, { duration: 300 });
        translateY.value = withTiming(piece.correctY, { duration: 300 });

        piece.fixed = true;
        piece.x = piece.correctX;
        piece.y = piece.correctY;
        runOnJS(onUpdate)(piece.id, piece.correctX, piece.correctY, true);
      } else {
        // Si no está cerca, mantener en posición actual o devolver al área flotante
        const inPuzzleArea = currentX >= 0 && currentX <= puzzleSize &&
                           currentY >= 0 && currentY <= puzzleSize;

        if (!inPuzzleArea) {
          // Devolver al área flotante si está fuera del área del puzzle
          const floatingX = Math.max(0, Math.min(width - pieceSize - 40, currentX));
          const floatingY = Math.max(puzzleSize + 20, Math.min(puzzleSize + 140, currentY));

          translateX.value = withTiming(floatingX, { duration: 200 });
          translateY.value = withTiming(floatingY, { duration: 200 });
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ]
  }));

  // Calcular el offset de la imagen para mostrar solo esta pieza
  const imageOffsetX = useIndividualTile ? 0 : -piece.col * pieceSize;
  const imageOffsetY = useIndividualTile ? 0 : -piece.row * pieceSize;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.piece,
          animatedStyle,
          {
            width: pieceSize,
            height: pieceSize,
            left: 0,  // Usar translateX para posicionamiento absoluto
            top: 0,   // Usar translateY para posicionamiento absoluto
            zIndex: piece.fixed ? 1 : 10
          }
        ]}
      >
        <View style={[styles.pieceImageContainer, { width: pieceSize, height: pieceSize }]}>
          <Image
            source={imageSource}
            style={[
              styles.pieceImage,
              {
                width: useIndividualTile ? pieceSize : pieceSize * gridSize,
                height: useIndividualTile ? pieceSize : pieceSize * gridSize,
                left: imageOffsetX,
                top: imageOffsetY
              }
            ]}
            resizeMode="cover"
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative'
  },
  puzzleContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  previewImage: {
    position: 'absolute',
    opacity: 0.3,
    borderRadius: 10
  },
  floatingArea: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center'
  },
  piece: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  pieceImageContainer: {
    overflow: 'hidden',
    borderRadius: 20
  },
  pieceImage: {
    position: 'absolute'
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 5
  },
  debugText: {
    color: 'white',
    fontSize: 12
  }
});