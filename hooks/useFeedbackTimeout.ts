import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Feedback UI avec clearTimeout au unmount — évite timers orphelins.
 */
export function useFeedbackTimeout(durationMs = 4000) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showFeedback = useCallback(
    (message: string) => {
      setFeedback(message);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFeedback(null), durationMs);
    },
    [durationMs]
  );

  return { feedback, setFeedback, showFeedback };
}
