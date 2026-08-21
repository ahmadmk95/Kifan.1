// Lightweight multimodal (haptic) feedback. Uses the Vibration API where it
// exists (Android/Chrome); a silent no-op everywhere else (incl. iOS Safari).
function buzz(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export const tap = () => buzz(8);           // light: taps, tab changes, shares
export const success = () => buzz([10, 30, 16]); // positive: saved, prepared
export const warn = () => buzz([22, 50, 22]);    // caution: cancelled, error
