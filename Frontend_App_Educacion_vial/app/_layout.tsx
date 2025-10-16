import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text, Dimensions, Animated, ImageBackground } from 'react-native';

const { width, height } = Dimensions.get('window');

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.barWrap}>
      <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.04));
    }, 120);
    return () => { clearInterval(id); };
  }, []);

  return (
    <View style={styles.loadingRoot}>
      <ImageBackground source={require('../assets/images/fondo-loading.png')} style={styles.bgImage} resizeMode="cover">
        <View style={styles.dim} />
        <View style={styles.centerBox}>
        <Image source={require('../assets/images/logoPrincipal.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.loadingText}>Cargando…</Text>
        <ProgressBar progress={progress} />
        </View>
      </ImageBackground>
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = React.useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 3500); // simula carga
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShowOverlay(false);
      });
    }
  }, [ready]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {showOverlay && (
        <Animated.View style={[StyleSheet.absoluteFillObject as any, { opacity: overlayOpacity, zIndex: 999 }]}> 
          <LoadingScreen />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loadingRoot: { flex: 1, backgroundColor: '#000' },
  bgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: width * 0.8, height: 260, marginBottom: 20 },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4, marginBottom: 12 },
  barWrap: { width: width * 0.7, height: 12, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  barFill: { height: '100%', backgroundColor: '#FFD700' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
});
