// @vitest-environment node

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { sanitizeImageFile } from "./sanitize";

describe("sanitizeImageFile", () => {
  it("re-encodes images without preserving EXIF metadata", async () => {
    const original = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: "#0f766e",
      },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Tank Copilot test metadata" } })
      .toBuffer();

    expect((await sharp(original).metadata()).exif).toBeDefined();

    const sanitized = await sanitizeImageFile(
      new File([blobPart(original)], "observation.jpg", { type: "image/jpeg" }),
    );

    expect(sanitized.error).toBeNull();
    expect(sanitized.image?.contentType).toBe("image/jpeg");
    expect(sanitized.image?.extension).toBe("jpg");
    expect((await sharp(sanitized.image?.data).metadata()).exif).toBeUndefined();
  });

  it("rejects declared image files that cannot be decoded", async () => {
    const sanitized = await sanitizeImageFile(
      new File(["not actually an image"], "fake.jpg", { type: "image/jpeg" }),
    );

    expect(sanitized).toMatchObject({
      error: "Photo could not be processed as an image",
      image: null,
    });
  });

  it("rejects files whose bytes do not match their declared image type", async () => {
    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: "#111827",
      },
    })
      .png()
      .toBuffer();

    const sanitized = await sanitizeImageFile(
      new File([blobPart(png)], "mismatch.jpg", { type: "image/jpeg" }),
    );

    expect(sanitized).toMatchObject({
      error: "Photo content must match its declared image type",
      image: null,
    });
  });
});

function blobPart(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(buffer);
  return view;
}
