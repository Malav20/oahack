import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import nlp from 'compromise';

export const dynamic = 'force-dynamic';

const redactText = (text: string): string => {
  const patterns = [
    { regex: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[REDACTED_EMAIL]' },
    { regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },
    { regex: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[REDACTED_CARD]' },
  ];
  let result = text;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }
  return result;
};

const redactWithNER = (text: string): string => {
  const doc = nlp(text);
  doc.people().replaceWith('[REDACTED_PERSON]');
  doc.places().replaceWith('[REDACTED_PLACE]');
  doc.organizations().replaceWith('[REDACTED_ORG]');
  return doc.text();
};

const generateRedactedPDF = async (text: string): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  const lines = text.split('\n');
  let y = 780;

  for (const line of lines) {
    if (y < 50) break;
    page.drawText(line, { x: 50, y, size: fontSize, font });
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  const tempFilePath = `uploads/${Date.now()}-${file.name}`;

  try {
    await fs.mkdir('uploads', { recursive: true });
    await fs.writeFile(tempFilePath, Buffer.from(await file.arrayBuffer()));

    let extractedText = '';

    if (ext === '.pdf') {
      const dataBuffer = await fs.readFile(tempFilePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const result = await Tesseract.recognize(tempFilePath, 'eng');
      extractedText = result.data.text;
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const regexRedacted = redactText(extractedText);
    const finalRedacted = redactWithNER(regexRedacted);
    const pdfBuffer = await generateRedactedPDF(finalRedacted);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="redacted.pdf"',
      },
    });
  } catch (err) {
    console.error('Redaction failed:', err);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  } finally {
    fs.unlink(tempFilePath).catch(() => {});
  }
}
