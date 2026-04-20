/**
 * 阿里云一句话识别 (ASR) 跟读代理引擎
 * 包括录音生命周期与“两次容错”重试机制，返回相似度比对结果。
 */
import { AudioModule, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';
import type { ShadowingResult } from '../types/courseware';

// 在实际应用中此处为自建后端的代理接口
const ASR_PROXY_ENDPOINT = 'https://api.neuroglot.app/speech/recognize';

export class ShadowingEvaluator {
  private consecutiveFailCount = 0;
  private recording: AudioRecorder | null = null;

  // ==========================
  // 核心业务：录音生命周期控制
  // ==========================
  async startRecording(): Promise<void> {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Need microphone permission to shadow');
    }
    
    // 配置为阿里云期望的 PCM/WAV (16kHz, mono) 参数，确保最大的 ASR 识别率
    this.recording = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    this.recording.record();
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('Not currently recording');
    }
    await this.recording.stop();
    const uri = this.recording.uri;
    this.recording = null;
    return uri || '';
  }

  // ==========================
  // 与代理服务器交互与判定
  // ==========================
  private async uploadToProxy(audioUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      name: 'shadowing.wav',
      type: 'audio/wav',
    } as any);

    const res = await fetch(ASR_PROXY_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('ASR backend error');
    
    const result = await res.json();
    return result.text || ''; // Return recognized text
  }

  /**
   * 基础归一化算法，消除因为口音、大小写导致的误差。
   */
  private normalizeString(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  }

  /** 计算两个归一化字符串的编辑距离 */
  private getLevenshteinDistance(a: string, b: string): number {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const arr = [];
    for (let i = 0; i <= b.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= a.length; j++) {
            arr[i][j] = i === 0 ? j
                : Math.min(
                    arr[i - 1][j] + 1,
                    arr[i][j - 1] + 1,
                    arr[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
                );
        }
    }
    return arr[b.length][a.length];
  }

  private computeSimilarity(actual: string, expected: string): number {
    const a = this.normalizeString(actual);
    const e = this.normalizeString(expected);
    if (!a && !e) return 1;
    if (!a || !e) return 0;
    
    const maxLen = Math.max(a.length, e.length);
    const dist = this.getLevenshteinDistance(a, e);
    return 1 - (dist / maxLen);
  }

  // ==========================
  // 执行评估验证，包含2次失败跳过的容错
  // ==========================
  async evaluate(recordingUri: string, expectedText: string): Promise<ShadowingResult> {
    if (this.consecutiveFailCount >= 2) {
      // 容错门限触发：不调用网络接口，强行判定放行（Skip）
      return {
        recognized: false,
        verdict: 'skip',
        error: '连续发生识别故障，自动静默过关',
      };
    }

    try {
      const text = await this.uploadToProxy(recordingUri);
      
      // 如果阿里云返回空，视为没听清/噪音/口音太重，累加防卡死门限
      if (!text || text.trim().length === 0) {
        this.consecutiveFailCount++;
        return {
          recognized: false,
          verdict: 'poor',
          error: '未能识别出有效的麦克风语音流',
        };
      }

      // 如果有清晰识别结果，代表 ASR 和录音环境没问题，重置失败门限
      this.consecutiveFailCount = 0;
      
      const similarity = this.computeSimilarity(text, expectedText);
      const verdict = similarity >= 0.6 ? 'good' : 'poor';

      return {
        recognized: true,
        recognizedText: text,
        similarity,
        verdict,
      };

    } catch (error: any) {
      // 网络层失败同样累加防卡死门限
      this.consecutiveFailCount++;
      return {
        recognized: false,
        error: error.message || '网络或服务端不可用',
      };
    }
  }

  resetFailCount() {
    this.consecutiveFailCount = 0;
  }
}

// 暴露全局实例供 Store / View 调用
export const shadowingEvaluator = new ShadowingEvaluator();
