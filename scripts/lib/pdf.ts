import { createCanvas, loadImage } from "@napi-rs/canvas";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

async function openPdf(file: string) {
  const data = new Uint8Array(await Bun.file(file).arrayBuffer());
  return getDocumentProxy(data);
}

/** Text of every page (one string per page, line breaks preserved). */
export async function readPdfPages(file: string): Promise<string[]> {
  const pdf = await openPdf(file);
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

export async function pdfPageCount(file: string): Promise<number> {
  const pdf = await openPdf(file);
  return pdf.numPages;
}

/** Fractions (0–1) to cut off each side, e.g. to remove a scanned header or footer. */
export type Crop = { top: number; right: number; bottom: number; left: number };

/** Parse "top,right,bottom,left" in percent, e.g. "5,0,7,0". */
export function parseCrop(value: string): Crop {
  const parts = value.split(",").map((v) => Number.parseFloat(v.trim()));
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isFinite(n) || n < 0 || n >= 50)
  ) {
    throw new Error(
      `--crop must be "top,right,bottom,left" in percent (each 0–49), got "${value}"`,
    );
  }
  const [top = 0, right = 0, bottom = 0, left = 0] = parts.map((n) => n / 100);
  return { top, right, bottom, left };
}

/** Render one page (1-based) to WebP, at most `maxWidth` pixels wide, optionally cropped. */
export async function renderPageToWebp(
  file: string,
  pageNumber: number,
  { maxWidth = 1600, crop }: { maxWidth?: number; crop?: Crop } = {},
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const pdf = await openPdf(file);
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(
      `${file} has ${pdf.numPages} pages; page ${pageNumber} does not exist`,
    );
  }
  const data = await renderPageAsImage(pdf, pageNumber, {
    canvasImport: () => import("@napi-rs/canvas"),
    width: maxWidth,
    format: "webp",
    quality: 0.85,
  });
  const image = await loadImage(Buffer.from(data));
  if (!crop) return { data, width: image.width, height: image.height };

  const sx = Math.round(image.width * crop.left);
  const sy = Math.round(image.height * crop.top);
  const width = Math.round(image.width * (1 - crop.left - crop.right));
  const height = Math.round(image.height * (1 - crop.top - crop.bottom));
  const canvas = createCanvas(width, height);
  canvas
    .getContext("2d")
    .drawImage(image, sx, sy, width, height, 0, 0, width, height);
  return {
    data: new Uint8Array(await canvas.encode("webp", 85)),
    width,
    height,
  };
}
