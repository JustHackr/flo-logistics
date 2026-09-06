import Image, { type ImageProps } from "next/image";
import { withBasePath } from "@/lib/base-path";

type Props = Omit<ImageProps, "src"> & {
  src: string;
};

/**
 * next/image optimizer currently fails for local files under basePath in this
 * app, so we serve public assets directly with the prefixed path.
 */
export function SiteImage({ src, alt, ...props }: Props) {
  return (
    <Image
      {...props}
      src={withBasePath(src)}
      alt={alt}
      unoptimized
    />
  );
}
