import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * Audio Player Service
 * Manages playback of TTS audio files from local filesystem
 */

let currentPlayer: AudioPlayer | null = null;

export interface PlaybackState {
  isPlaying: boolean;
  error: string | null;
}

/** Play audio from local file path */
export async function playAudio(localPath: string): Promise<void> {
  try {
    // Stop any existing playback
    await stopAudio();

    currentPlayer = createAudioPlayer(localPath);
    await currentPlayer.play();
  } catch (err) {
    console.error('Audio playback error:', err);
    throw err;
  }
}

/** Stop current playback */
export async function stopAudio(): Promise<void> {
  if (currentPlayer) {
    try {
      await currentPlayer.pause();
    } catch {
      // Ignore errors on stop
    }
    currentPlayer.release();
    currentPlayer = null;
  }
}

/** Check if audio file exists and can be played */
export function isAudioAvailable(localPath: string | null | undefined): boolean {
  return !!localPath && localPath.length > 0;
}
