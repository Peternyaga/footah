"use client";

import { Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BackgroundAnthemProps = {
  src: string;
};

export function BackgroundAnthem({ src }: BackgroundAnthemProps) {
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const playAnthem = useCallback(() => {
    const audio = document.getElementById("background-anthem") as HTMLAudioElement | null;
    if (!audio) return;

    audio.volume = 0.72;
    audio.muted = false;

    const result = audio.play();
    if (!result) return;

    result
      .then(() => setNeedsUnlock(false))
      .catch(() => setNeedsUnlock(true));
  }, []);

  useEffect(() => {
    const audio = document.getElementById("background-anthem") as HTMLAudioElement | null;
    if (!audio) return;

    const markPlaying = () => setNeedsUnlock(false);
    const tryWhenVisible = () => {
      if (document.visibilityState === "visible") playAnthem();
    };

    audio.addEventListener("play", markPlaying);
    audio.addEventListener("canplay", playAnthem);
    window.addEventListener("pageshow", playAnthem);
    document.addEventListener("visibilitychange", tryWhenVisible);

    const gestureEvents: Array<keyof WindowEventMap> = ["click", "pointerdown", "touchstart", "keydown"];
    for (const event of gestureEvents) {
      window.addEventListener(event, playAnthem, { capture: true, passive: true });
    }

    playAnthem();

    return () => {
      audio.removeEventListener("play", markPlaying);
      audio.removeEventListener("canplay", playAnthem);
      window.removeEventListener("pageshow", playAnthem);
      document.removeEventListener("visibilitychange", tryWhenVisible);
      for (const event of gestureEvents) {
        window.removeEventListener(event, playAnthem, { capture: true });
      }
    };
  }, [playAnthem]);

  return (
    <>
      <audio id="background-anthem" src={src} autoPlay loop preload="auto" aria-hidden="true" />
      {needsUnlock && (
        <button className="anthem-unlock" type="button" onClick={playAnthem} aria-label="Play anthem">
          <Volume2 />
        </button>
      )}
    </>
  );
}
