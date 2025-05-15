import { Mistral } from '@mistralai/mistralai';

type WordBox = { text: string; bbox: any };
type MergeResult = { data: Array<{ bbox: number[]; text: string[] }> };

export async function mergeVerify(
  lines: any[],
  mistralOCR: string,
  prompt: string
): Promise<MergeResult> {
  try {
    const client = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY! });

    // Create an optimized prompt that combines both tasks in a single call
    const systemMsg = `You are a helpful assistant that can process OCR data. Your task is to:
1. Compare Tesseract OCR data (which has bounding boxes) with Mistral OCR data (which may have more accurate text)
2. Create a merged JSON output
3. Identify sensitive information that should be redacted based on the user's request`;

    const userMsg = `I have OCR data from two sources:

1. Tesseract OCR data with bounding boxes: ${JSON.stringify(lines)}

2. Mistral OCR data (may have more accurate text): ${mistralOCR}

3. User's redaction request: ${prompt}

TASK 1: First, create a merged JSON of the OCR data with this structure:
{
  "data": [
    {
      "bbox": [x1, y1, x2, y2],  // Bounding box coordinates from Tesseract
      "text": ["text value"]     // Text from Mistral OCR when possible, or Tesseract if no match
    },
    // More entries...
  ]
}

CONVERSION INSTRUCTIONS:
- For each Tesseract entry, convert from {x, y, width, height} format to [x0, y0, x1, y1] format.
- x0 = x
- y0 = y
- x1 = x + width
- y1 = y + height
- Use the bounding boxes from Tesseract (converted to the format above)
- Prioritize text from Mistral OCR when there's a matching text based on similarity

TASK 2: From the merged OCR data, identify ONLY text elements that should be redacted based on the user's request.
Return the final output with ONLY the elements that need redaction in this exact structure:
{
  "data": [
    {
      "bbox": [x1, y1, x2, y2],  // Bounding box coordinates of the text to be redacted
      "text": ["text to redact"]  // The sensitive text content that should be redacted
    },
    // More entries as needed...
  ]
}

If no text needs to be redacted, return {"data": []}.
IMPORTANT: Respond ONLY with the valid JSON object containing ONLY the elements to be redacted. No additional text or explanations.`;

    const result = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg }
      ]
    });

    // Extract JSON from the response
    const responseContent = result.choices[0].message.content || '';
    console.log("\n\nMistral response content:", responseContent);
    // Use regex to extract the JSON object
    const jsonRegex = /{[\s\S]*}/g;
    const jsonMatch = responseContent.match(jsonRegex);
    let parsedResult = { data: [] };
    
    if (jsonMatch && jsonMatch[0]) {
      try {
        // Parse the extracted JSON
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch (error) {
          console.error("Error parsing Mistral's JSON response:", error);
          // Try to fix the JSON with a fallback approach
          const fixedJson = responseContent.replace(/[\n\r\t]/g, ' ')
                                         .replace(/,\s*}/g, '}')
                                         .replace(/,\s*]/g, ']');
          
          // Try to find a valid JSON object in the fixed content
          const fixedJsonMatch = fixedJson.match(jsonRegex);
          if (fixedJsonMatch && fixedJsonMatch[0]) {
            try {
              parsedResult = JSON.parse(fixedJsonMatch[0]);
            } catch (innerError) {
              console.error("Failed to fix JSON:", innerError);
            }
          }
        }
      } catch (parseError) {
        console.error("Error parsing Mistral's JSON response:", parseError);
      }
    } else {
      console.error("No valid JSON found in Mistral's response");
    }
    
    return parsedResult;
  } catch (error) {
    console.error("Error processing OCR data:", error);
    return { data: [] };
  }
}