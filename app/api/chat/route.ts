// File: app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { prompt, ocrData } = await request.json();
    if (!prompt || !ocrData) {
      return NextResponse.json(
        { error: 'Missing prompt or ocrData' },
        { status: 400 }
      );
    }

    const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });

    // build your messages array as before…
    const messages: Array<
      | { role: 'system'; content: string }
      | { role: 'user'; content: string }
    > = [
      {
        role: 'system',
        content: `You are an assistant that can answer questions based on OCR data:\n\n${JSON.stringify(
          ocrData
        )}`,
      },
      { role: 'user', content: prompt },
    ];

    // ← use chat.stream, not chat.complete
    const stream = await client.chat.stream({
      model: 'mistral-large-latest',
      messages,
    }); // no 'stream: true' here :contentReference[oaicite:0]{index=0}

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // stream is already an async iterable
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
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
