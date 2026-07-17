const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetPath(path: string): string {
  const absolutePath = path.startsWith("/") ? path : `/${path}`;

  return `${basePath}${absolutePath}`;
}
