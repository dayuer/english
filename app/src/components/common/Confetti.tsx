import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const COLORS = ['#3e6374', '#8db3c6', '#4a8c6f', '#8a7545', '#4f6176', '#c1e8fc'];

interface ConfettiProps {
  count?: number;
}

interface PieceConfig {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
}

function ConfettiPiece({ config }: { config: PieceConfig }) {
  const translateY = useRef(new Animated.Value(-10)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 80;
    const spin = Math.random() * 720 - 360;

    Animated.sequence([
      Animated.delay(config.delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 800,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: drift,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: spin,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(config.duration * 0.6),
          Animated.timing(opacity, {
            toValue: 0,
            duration: config.duration * 0.4,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: config.left,
          backgroundColor: config.color,
          transform: [
            { translateY },
            { translateX },
            {
              rotate: rotate.interpolate({
                inputRange: [-360, 360],
                outputRange: ['-360deg', '360deg'],
              }),
            },
          ],
          opacity,
        },
      ]}
    />
  );
}

export function Confetti({ count = 40 }: ConfettiProps) {
  const pieces = React.useMemo<PieceConfig[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 600,
        duration: 2000 + Math.random() * 1500,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
      })),
    [count]
  );

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} config={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: -10,
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
