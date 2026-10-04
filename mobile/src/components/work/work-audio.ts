import { AccessibilityInfo } from 'react-native';

/**
 * Temporary boundary for work-flow voice prompts.
 * Replace this implementation with the hat/TTS native module without changing screens.
 */
export async function announceWorkPrompt(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}
