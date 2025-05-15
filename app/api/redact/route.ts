import { NextResponse } from "next/server";
import { convertPdfToImages } from "@/app/lib/pdfToImages";
import { tesseractOCR } from "@/app/lib/teserractOCR";
import { mistralOCR } from "@/app/lib/mistralOCR";
import { mergeVerify } from "@/app/lib/mergeVerify";
import { redactPdf } from "@/app/lib/redactPDF";


export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  const prompt = form.get('prompt') as string | null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const pdfBuffer = Buffer.from(buffer);

  // 1. Rasterize
  const pageImages = await convertPdfToImages(pdfBuffer);

 // console.log("Page Images = ",pageImages);


  // 2. Tesseract coords
  const tessData = await Promise.all(pageImages.imageBuffers.map(img => tesseractOCR(img)));

  //console.log("Tesseract Data = ",JSON.stringify(tessData));

  // 3. Mistral text
  const ocrJson = await mistralOCR(buffer);

  //console.log("Mistral OCR JSON = ",ocrJson);

  //4. Merge + verify via chat
  const redactions = await mergeVerify(tessData[0].lines, ocrJson.pages[0].markdown, prompt || '');
  
  console.log("Redactions = ",JSON.stringify(redactions));

  // 5. Redact & output PDF
  const newPdf = await redactPdf(buffer, redactions, { heightPx: pageImages.dimensions[0].height, widthPx: pageImages.dimensions[0].width });
  
  // Return the redacted PDF file that can be viewed directly in Postman
  return new NextResponse(newPdf, {
    headers: { 
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="redacted_document.pdf"` 
    }
  });
}

