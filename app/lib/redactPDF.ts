import { PDFDocument, rgb } from 'pdf-lib';

// Updated type to match the new JSON structure
type RedactionData = {
  data: Array<{
    bbox: number[];
    text: string[];
  }>
};

export async function redactPdf(
  buffer: ArrayBuffer,
  redactions: RedactionData,
  imageDims: { widthPx: number, heightPx: number }  
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer);
  const [page] = pdfDoc.getPages();
  const { width: pageW, height: pageH } = page.getSize();

  // The scale factor used during PDF.js rendering is 1.5
  const pdfJsScaleFactor = 1.0;
  
  // Get the actual PDF dimensions to image dimensions ratio
  // We need to account for the PDF.js scaling factor used during rendering
  const scaleX = pageW / (imageDims.widthPx / pdfJsScaleFactor);
  const scaleY = pageH / (imageDims.heightPx / pdfJsScaleFactor);
  
  // Optional calibration factors - adjust these if redactions are still off
  // These help compensate for any differences between Puppeteer screenshot and PDF coordinates
  const calibrationXOffset = 0; // Positive moves right, negative moves left
  const calibrationYOffset = 0; // Positive moves up, negative moves down
  const calibrationWidthFactor = 1.0; // Adjust if rectangles are too wide or narrow
  const calibrationHeightFactor = 1.0; // Adjust if rectangles are too tall or short

  // Debug logging
  console.log("PDF dimensions:", { pageW, pageH });
  console.log("Image dimensions:", { width: imageDims.widthPx, height: imageDims.heightPx });
  console.log("Scale factors:", { scaleX, scaleY, pdfJsScaleFactor });
  
  for (const { bbox, text } of redactions.data) {
    // Convert bbox coordinates to numbers
    const [x0, y0, x1, y1] = bbox.map(Number);
    
    // Calculate rectangle width and height in PDF coordinates
    const rectW = (x1 - x0) * scaleX * calibrationWidthFactor;
    const rectH = (y1 - y0) * scaleY * calibrationHeightFactor;
    
    // Convert to PDF coordinates (origin at bottom-left)
    // We need to flip the Y coordinate
    const pdfX = (x0 * scaleX) + calibrationXOffset;
    const pdfY = pageH - (y1 * scaleY) + calibrationYOffset;

    // Log coordinates for debugging
    console.log("Redaction:", { 
      original: { x0, y0, x1, y1 }, 
      pdf: { x: pdfX, y: pdfY, width: rectW, height: rectH } 
    });

    // Skip tiny boxes
    if (rectW < 1 || rectH < 1) continue;

    // Add extra padding to ensure full coverage
    page.drawRectangle({
      x:      pdfX - 4,
      y:      pdfY - 4,
      width:  rectW + 8,
      height: rectH + 8,
      color:  rgb(0,0,0)
    });
  }

  return pdfDoc.save();
}
