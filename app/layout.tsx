import type { Metadata } from "next";
import "./globals.css";

const backgroundAudioUrl = "/assets/music/world-cup-2026-anthem-dna-ultralight.mp3";

export const metadata: Metadata = {
  title: "The Final Whistle · Office Pool",
  description: "A private office pool for the 2026 World Cup Final.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href={backgroundAudioUrl} as="audio" type="audio/mpeg" />
        <link rel="preload" href="/assets/images/dna-performance-commons-wide.jpg" as="image" />
      </head>
      <body>
        <audio id="background-anthem" src={backgroundAudioUrl} autoPlay loop preload="auto" aria-hidden="true" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const playAnthem = () => {
                  const audio = document.getElementById("background-anthem");
                  if (!audio) return;
                  audio.volume = 0.72;
                  audio.play().catch(() => {});
                };
                playAnthem();
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", playAnthem, { once: true });
                }
                window.addEventListener("pointerdown", playAnthem, { once: true, capture: true });
                window.addEventListener("touchstart", playAnthem, { once: true, capture: true });
                window.addEventListener("keydown", playAnthem, { once: true, capture: true });
              })();
            `,
          }}
        />
        <div className="image-backdrop" aria-hidden="true">
          <video
            id="background-performance-video"
            className="backdrop-video"
            src="/assets/videos/dna-performance-background.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/assets/images/dna-performance-commons-wide.jpg"
          />
          <span className="backdrop-frame backdrop-performance-wide" />
          <span className="backdrop-frame backdrop-performance-stage" />
          <span className="backdrop-frame backdrop-performance-duet" />
          <span className="backdrop-frame backdrop-performance-close" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const playVideo = () => {
                  const video = document.getElementById("background-performance-video");
                  if (!video) return;
                  video.muted = true;
                  video.play().catch(() => {});
                };
                playVideo();
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", playVideo, { once: true });
                } else {
                  playVideo();
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
