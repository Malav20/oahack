// File: app/api/ocr-chat/route.ts
import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const prompt = form.get('prompt');
    const file = form.get('file');

    if (typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });

    let ocrContent = '';

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      const documentChunk =
        file.type.startsWith('image/')
          ? { type: 'image_url' as const, imageUrl: dataUrl }
          : { type: 'document_url' as const, documentUrl: dataUrl };

      const ocrResult = await client.ocr.process({
        model: 'mistral-ocr-latest',
        document: documentChunk
      });

      ocrContent = JSON.stringify(ocrResult);
    }

    const messages: Array<
      | { role: 'system'; content: string }
      | { role: 'user'; content: string }
    > = [
      {
        role: 'system',
        content: ocrContent
          ? `You are an assistant that can answer questions based on OCR data:\n\n${ocrContent}. Only return classification results and nothing else.`
          : 'You are an assistant.',
      },
      { role: 'user', content: prompt },
    ];

    const stream = await client.chat.stream({
      model: 'mistral-large-latest',
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of stream) {
            const delta = part.data.choices[0].delta.content;
            if (typeof delta === 'string') controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: Error | unknown) {
    console.error('OCR-Chat route error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
