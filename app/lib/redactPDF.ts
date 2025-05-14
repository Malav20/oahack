import { PDFDocument, rgb } from 'pdf-lib';

type Redaction = { page: number; bbox: { x0: number; y0: number; x1: number; y1: number } };

export async function redactPdf(
  buffer: ArrayBuffer,
  redactions: Redaction[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();

  for (const { page, bbox } of redactions) {
    const pg = pages[page - 1];
    const { width, height } = pg.getSize();
    const y = height - bbox.y1;
    const w = bbox.x1 - bbox.x0;
    const h = bbox.y1 - bbox.y0;

    pg.drawRectangle({ x: bbox.x0, y, width: w, height: h, color: rgb(0, 0, 0) });
  }

  return await pdfDoc.save();
}