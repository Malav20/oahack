// File: app/api/ocr/route.ts
import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

export const runtime = 'nodejs';
type OCRDocument =
  | { type: 'image_url'; imageUrl: string }
  | { type: 'document_url'; documentUrl: string };

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  //Max upload size is 5MB

  if(file.size > 5000000) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  //Only allow pdf and images
  if(!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Read file into ArrayBuffer and Base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Determine chunk based on MIME type
  let documentChunk: { type: 'image_url'; imageUrl: string } | { type: 'document_url'; documentUrl: string };
  if (file.type.startsWith('image/')) {
    // For images: use data URL as image_url
    const dataUrl = `data:${file.type};base64,${base64}`;
    documentChunk = {
      type: 'image_url',
      imageUrl: dataUrl,
    };
  } else {
    // For documents (PDF, etc.): use data URL as document_url
    const dataUrl = `data:${file.type};base64,${base64}`;
    documentChunk = {
      type: 'document_url',
      documentUrl: dataUrl,
    };
  }

  // Initialize Mistral client
  const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });

  // Call the OCR API
  const ocrResult = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: documentChunk as OCRDocument,
  });

  return NextResponse.json(ocrResult);
}
