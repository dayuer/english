import { useState, useCallback, useRef } from 'react';
import { playAudio, stopAudio, isAudioAvailable } from '../services/audio-player';

interface UseAudioReturn {
  isPlaying: boolean;
  error: string | null;
  play: (path: string) => Promise<void>;
  stop: () => Promise<void>;
  available: (path: string | null | undefined) => boolean;
}

export function useAudio(): UseAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async (path: string) => {
    try {
      setError(null);
      setIsPlaying(true);
      await playAudio(path);
      // Auto-reset when done (playAudio is fire-and-forget for short clips)
      setTimeout(() => setIsPlaying(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio playback failed');
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(async () => {
    await stopAudio();
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    error,
    play,
    stop,
    available: isAudioAvailable,
  };
}
