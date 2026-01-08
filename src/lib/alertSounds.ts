/**
 * Alert Sound System using Web Audio API
 * Generates different beep patterns for different alert types
 */

type SoundType = 'success' | 'warning' | 'danger';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, startTime: number): void {
  const ctx = getAudioContext();
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  // Fade in/out for smoother sound
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.02);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export async function playAlertSound(type: SoundType): Promise<void> {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required for user gesture policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'success':
        // Success: 2 pleasant high tones (ding-ding)
        playTone(880, 0.15, now);           // A5
        playTone(1100, 0.15, now + 0.2);    // C#6
        break;
        
      case 'warning':
        // Warning: 2 medium tones (beep-beep)
        playTone(660, 0.2, now);            // E5
        playTone(660, 0.2, now + 0.3);      // E5
        break;
        
      case 'danger':
        // Danger: 3 rapid low tones (beep-beep-beep)
        playTone(440, 0.1, now);            // A4
        playTone(440, 0.1, now + 0.15);     // A4
        playTone(440, 0.1, now + 0.3);      // A4
        break;
    }
  } catch (error) {
    console.error('Error playing alert sound:', error);
  }
}

export function getSoundTypeForAlert(alertType: 'price_target' | 'stop_loss' | 'margin_call'): SoundType {
  switch (alertType) {
    case 'price_target':
      return 'success';
    case 'margin_call':
      return 'danger';
    case 'stop_loss':
    default:
      return 'warning';
  }
}
