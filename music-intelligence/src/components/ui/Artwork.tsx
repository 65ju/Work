import Image from "next/image";
import type { ImageRef } from "@/domain/types";
import { pickImage } from "@/lib/client/format";

/**
 * Renders provider artwork as supplied (no filters, overlays or cropping of album art).
 * Artist photos use cover fit because Spotify supplies them in varying aspect ratios.
 */
export function Artwork({
  images,
  alt,
  size,
  className = "",
  rounded = "rounded-[3px]",
  priority = false,
  kind = "album",
}: {
  images: ImageRef[];
  alt: string;
  size: number;
  className?: string;
  rounded?: string;
  priority?: boolean;
  kind?: "album" | "artist";
}) {
  const src = pickImage(images, size);
  if (!src) {
    return (
      <div
        className={`grid place-items-center bg-ink-3 font-serif text-muted italic ${rounded} ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {alt.slice(0, 1)}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={`${kind === "artist" ? "object-cover" : "object-contain"} bg-ink-2 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
