import { Mistral } from '@mistralai/mistralai';

export async function mistralOCR(buffer: ArrayBuffer): Promise<any> {
  const base64 = Buffer.from(buffer).toString('base64');
  const dataUrl = `data:application/pdf;base64,${base64}`;

  const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });
  const result = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: { type: 'document_url', documentUrl: dataUrl }
  });
 // console.log("Mistral OCR Result = ",result);
  return result;
}