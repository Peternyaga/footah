import type { Metadata } from "next";
import { assetPath } from "../lib/assets";
import { BackgroundAnthem } from "./BackgroundAnthem";
import "./globals.css";

const backgroundAudioUrl = assetPath("/assets/music/world-cup-2026-anthem-dna-ultralight.mp3");
const backgroundPosterUrl = assetPath("/assets/images/dna-performance-commons-wide.jpg");

export const metadata: Metadata = {
  title: "The Final Whistle · Office Pool",
  description: "A private office pool for the 2026 World Cup Final.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href={backgroundAudioUrl} as="audio" type="audio/mpeg" />
        <link rel="preload" href={backgroundPosterUrl} as="image" />
      </head>
      <body>
        <BackgroundAnthem src={backgroundAudioUrl} />
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
                const unmuteAnthem = () => {
                  const audio = document.getElementById("background-anthem");
                  if (!audio) return;
                  audio.volume = 0.72;
                  audio.muted = false;
                  audio.play().catch(() => {});
                };
                playAnthem();
                [250, 750, 1500, 3000].forEach((delay) => window.setTimeout(unmuteAnthem, delay));
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", unmuteAnthem, { once: true });
                }
                window.addEventListener("pointerdown", unmuteAnthem, { capture: true });
                window.addEventListener("touchstart", unmuteAnthem, { capture: true });
                window.addEventListener("keydown", unmuteAnthem, { capture: true });
                window.addEventListener("scroll", unmuteAnthem, { capture: true, passive: true });
                window.addEventListener("wheel", unmuteAnthem, { capture: true, passive: true });
              })();
            `,
          }}
        />
        <div className="image-backdrop" aria-hidden="true">
          <video
            id="background-performance-video"
            className="backdrop-video"
            src={assetPath("/assets/videos/dna-performance-background.mp4")}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={backgroundPosterUrl}
          />
          <span className="backdrop-frame backdrop-performance-wide" style={{ backgroundImage: `url("${assetPath("/assets/images/dna-performance-commons-wide.jpg")}")` }} />
          <span className="backdrop-frame backdrop-performance-stage" style={{ backgroundImage: `url("${assetPath("/assets/images/dna-performance-stage-wide.jpg")}")` }} />
          <span className="backdrop-frame backdrop-performance-duet" style={{ backgroundImage: `url("${assetPath("/assets/images/dna-performance-duet-close.jpg")}")` }} />
          <span className="backdrop-frame backdrop-performance-close" style={{ backgroundImage: `url("${assetPath("/assets/images/dna-performance-press-square.jpeg")}")` }} />
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
