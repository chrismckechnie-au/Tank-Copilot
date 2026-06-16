import sharp from "sharp";

import { waterTestPhotoConfig } from "../tanks/validation";

type SupportedImageFormat = "jpeg" | "png" | "webp";
type SupportedContentType = (typeof waterTestPhotoConfig.allowedMimeTypes)[number];
type SupportedExtension = "jpg" | "png" | "webp";

const contentTypeByFormat: Record<SupportedImageFormat, SupportedContentType> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const extensionByContentType: Record<SupportedContentType, SupportedExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type SanitizedImageUpload = {
  data: Buffer;
  contentType: SupportedContentType;
  extension: SupportedExtension;
};

export async function sanitizeImageFile(file: File): Promise<{
  error: string | null;
  image: SanitizedImageUpload | null;
}> {
  const input = Buffer.from(await file.arrayBuffer());
  let format: SupportedImageFormat;

  try {
    const metadata = await sharp(input, { failOn: "error" }).metadata();

    if (
      metadata.format !== "jpeg" &&
      metadata.format !== "png" &&
      metadata.format !== "webp"
    ) {
      return { error: "Photo must be JPEG, PNG, or WebP", image: null };
    }

    format = metadata.format;
  } catch {
    return { error: "Photo could not be processed as an image", image: null };
  }

  const contentType = contentTypeByFormat[format];
  if (contentType !== file.type) {
    return { error: "Photo content must match its declared image type", image: null };
  }

  try {
    const pipeline = sharp(input, { failOn: "error" }).rotate();
    const data = await encodeWithoutMetadata(pipeline, format);

    if (data.length > waterTestPhotoConfig.maxBytes) {
      return { error: "Photo must be 5 MB or smaller after processing", image: null };
    }

    return {
      error: null,
      image: {
        data,
        contentType,
        extension: extensionByContentType[contentType],
      },
    };
  } catch {
    return { error: "Photo could not be processed as an image", image: null };
  }
}

function encodeWithoutMetadata(pipeline: sharp.Sharp, format: SupportedImageFormat) {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    case "png":
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    case "webp":
      return pipeline.webp({ quality: 88 }).toBuffer();
  }
}
