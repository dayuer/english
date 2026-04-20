/**
 * Haptic Feedback Service
 * iOS-only, uses expo-haptics
 */
import * as Haptics from 'expo-haptics';

export async function hapticSuccess() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function hapticError() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

export async function hapticTap() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function hapticMedium() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
