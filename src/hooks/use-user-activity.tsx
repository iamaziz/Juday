import { useEffect, useState, useRef } from "react";

const ACTIVITY_TIMEOUT_MS = 2000; // 2 seconds of inactivity to be considered idle

export function useUserActivity() {
  const [isUserActive, setIsUserActive] = useState(true); // Assume active initially
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsUserActive(true); // User is active
    timeoutRef.current = setTimeout(() => {
      setIsUserActive(false); // User is idle
    }, ACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    // Initial setup
    resetTimer();

    const events = ["mousemove", "mousedown", "scroll", "keydown", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return isUserActive;
}