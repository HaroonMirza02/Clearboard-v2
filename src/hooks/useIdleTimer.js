// In src/hooks/useIdleTimer.js
import { useEffect, useRef } from 'react';

export function useIdleTimer(onIdle, idleTimeInMs) {
  const timeoutId = useRef();

  const resetTimer = () => {
    clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(onIdle, idleTimeInMs);
  };

  useEffect(() => {
    // List of events that indicate user activity
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    // Set the initial timer
    resetTimer();

    // Add event listeners to reset the timer on activity
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      clearTimeout(timeoutId.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [onIdle, idleTimeInMs]);

  return null; // This hook doesn't render anything
}