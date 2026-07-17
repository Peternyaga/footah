"use client";

import { useCallback, useEffect } from "react";

type BackgroundAnthemProps = {
  src: string;
};

export function BackgroundAnthem({ src }: BackgroundAnthemProps) {
  const playAnthem = useCallback(() => {
    const audio = document.getElementById("background-anthem") as HTMLAudioElement | null;
    if (!audio) return;

    audio.volume = 0.72;
    audio.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const audio = document.getElementById("background-anthem") as HTMLAudioElement | null;
    if (!audio) return;

    const unmuteAndPlay = () => {
      audio.volume = 0.72;
      audio.muted = false;
      playAnthem();
    };

    const tryWhenVisible = () => {
      if (document.visibilityState === "visible") unmuteAndPlay();
    };

    audio.muted = true;
    playAnthem();

    const unmuteTimers = [250, 750, 1500, 3000].map((delay) => window.setTimeout(unmuteAndPlay, delay));

    audio.addEventListener("canplay", unmuteAndPlay);
    window.addEventListener("pageshow", unmuteAndPlay);
    document.addEventListener("visibilitychange", tryWhenVisible);

    const gestureEvents: Array<keyof WindowEventMap> = ["click", "pointerdown", "touchstart", "keydown", "scroll", "wheel"];
    for (const event of gestureEvents) {
      window.addEventListener(event, unmuteAndPlay, { capture: true, passive: true });
    }

    return () => {
      for (const timer of unmuteTimers) window.clearTimeout(timer);
      audio.removeEventListener("canplay", unmuteAndPlay);
      window.removeEventListener("pageshow", unmuteAndPlay);
      document.removeEventListener("visibilitychange", tryWhenVisible);
      for (const event of gestureEvents) {
        window.removeEventListener(event, unmuteAndPlay, { capture: true });
      }
    };
  }, [playAnthem]);

  return <audio id="background-anthem" src={src} autoPlay muted loop preload="auto" aria-hidden="true" />;
}
