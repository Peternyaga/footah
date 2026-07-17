import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const deployOnlyAssets = [
  "assets/music/world-cup-2026-anthem-dna.mp3",
  "assets/music/world-cup-2026-anthem-dna-light.mp3",
  "assets/videos/dna-performance-opening-ceremony.mov",
];

const htaccess = `Options -MultiViews
DirectoryIndex index.html

<IfModule mod_mime.c>
  AddType video/mp4 .mp4
  AddType audio/mpeg .mp3
  AddType image/jpeg .jpg .jpeg
  AddType image/png .png
  AddType image/webp .webp
  AddType text/css .css
  AddType text/javascript .js
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(mp4|mp3|jpg|jpeg|png|webp|js|css|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
`;

function copyStaticRoot(target) {
  cpSync("out", target, { recursive: true });

  for (const asset of deployOnlyAssets) {
    rmSync(join(target, asset), { force: true });
  }
}

if (!existsSync("out")) {
  throw new Error("Next.js export directory 'out' was not created.");
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/server", { recursive: true });
mkdirSync("dist/.openai", { recursive: true });
mkdirSync("dist/cpanel", { recursive: true });
copyStaticRoot("dist/assets");
copyStaticRoot("dist/cpanel");
writeFileSync("dist/cpanel/.htaccess", htaccess);
cpSync("scripts/site-worker.mjs", "dist/server/index.js");
cpSync(".openai/hosting.json", "dist/.openai/hosting.json");

console.log("Prepared static Sites bundle in dist/assets/ and cPanel bundle in dist/cpanel/.");
