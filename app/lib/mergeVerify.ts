import { Mistral } from '@mistralai/mistralai';

type WordBox = { text: string; bbox: any };

export async function mergeVerify(
  lines: any[],
  mistralJson: any,
  prompt: string
): Promise<Array<{ page: number; bbox: any }>> {
  const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });
  const systemMsg = `OCR JSON from Mistral:\n${JSON.stringify(mistralJson)}`;
  const userMsg = `${prompt}\n
  Don't change the bbox values. 
Please verify and return array of { page, bbox, text }. Tesseract OCR Data = ${JSON.stringify(lines)}`;

  const result = await client.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg }
    ]
  });

 // console.log("Merge Verify Result = ",result.choices[0].message.content);

  //return result.choices[0].message.content;
}