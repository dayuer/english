import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../ui/Icon';
import { useLessonStore } from '../../stores/lesson.store';
import { playAudio, stopAudio } from '../../services/audio-player';
import { shadowingEvaluator } from '../../services/shadowing';

interface ShadowingExerciseProps {
  promptText: string;
  expectedText: string;
  audioLocalPath?: string | null;
}

export function ShadowingExercise({ promptText, expectedText, audioLocalPath }: ShadowingExerciseProps) {
  const { shadowingVerdict, isRecording, setShadowingState, progress } = useLessonStore();
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handlePlayDemo = async () => {
    if (!audioLocalPath) return;
    try {
      setIsPlaying(true);
      await playAudio(audioLocalPath);
    } finally {
      // Very basic finish mock. In a real app we'd use expo-video/expo-audio callbacks
      setTimeout(() => setIsPlaying(false), 2000); 
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      // Stop and evaluate
      setShadowingState(shadowingVerdict, false);
      try {
        const uri = await shadowingEvaluator.stopRecording();
        if (uri) {
          const result = await shadowingEvaluator.evaluate(uri, expectedText);
          setShadowingState(result.verdict || 'poor', false);
          
          if (result.verdict === 'good' || result.verdict === 'skip') {
             // Let parent know we are good to proceed
             useLessonStore.setState({ progress: Math.min(progress + 20, 100) });
          }
        }
      } catch (e) {
        console.error(e);
        setShadowingState('poor', false); 
      }
    } else {
      // Start
      try {
        setShadowingState('idle', true);
        await shadowingEvaluator.startRecording();
      } catch (e) {
         console.error(e);
         setShadowingState('idle', false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.promptText}>{promptText}</Text>
      
      <TouchableOpacity 
        style={[styles.audioCard, isPlaying && styles.audioCardActive]} 
        onPress={handlePlayDemo}
        disabled={!audioLocalPath || isPlaying}
      >
        <Icon name="volume-up" color={isPlaying ? colors.accentBlue : colors.textPrimary} size={32} />
        <Text style={styles.audioHint}>听原声</Text>
      </TouchableOpacity>

      <View style={styles.recordSection}>
        <TouchableOpacity 
          style={[
            styles.recordButton, 
            isRecording && styles.recordButtonActive
          ]}
          onPress={handleRecordPress}
        >
           <Icon name={isRecording ? "stop" : "mic"} color={isRecording ? colors.bgDefault : colors.accentRose} size={48} />
        </TouchableOpacity>
        <Text style={styles.recordHint}>
          {isRecording ? "点击结束并识别" : "点击开始跟读"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  promptText: {
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing['3xl'],
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed,
  },
  audioCard: {
    width: 120,
    height: 120,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  audioCardActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  audioHint: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  recordSection: {
    alignItems: 'center',
  },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: `${colors.accentRose}14`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.accentRose,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 3,
  },
  recordButtonActive: {
    backgroundColor: colors.accentRose,
    shadowOpacity: 0.3,
  },
  recordHint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
  }
});
