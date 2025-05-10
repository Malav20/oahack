import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });

    const systemMessage = `You are an assistant that can answer questions based on OCR data. Only suggestion questions about the ocr data that user may ask. Provide 3 questions based on the following conversation that the user might ask next. Keep the questions very short to accomodate them in UI bubble. Return a response in this shape only nothing else {
  "suggestions": ["Suggestion 1?", "Suggestion 2?", "Suggestion 3?"]
}:`;

    const userMessage = `Here is the conversation so far:\n\n${JSON.stringify(
      messages
    )}\n\nProvide 3 questions based on the above conversation that the user might ask next.`;

    const chatMessages: Array<
      | { role: 'system'; content: string }
      | { role: 'user'; content: string }
    > = [
      {
        role: 'system',
        content: systemMessage,
      },
      { role: 'user', content: userMessage },
    ];

    const response = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: chatMessages,
    });

    if (response.choices && response.choices.length > 0) {
      return NextResponse.json(response.choices[0].message.content);
    } else {
      return NextResponse.json(
        { error: 'No choices returned from the API' },
        { status: 500 }
      );
    }
  } catch (err: Error | unknown) {
    console.error('Suggestions route error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}


