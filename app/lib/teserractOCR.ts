export async function tesseractOCR(imageBuffer: Buffer): Promise<{ lines: any[] }> {
  // Import dynamically only when needed
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker("eng", 1);

  // Request TSV output
  const { data } = await worker.recognize(imageBuffer, {}, { tsv: true });
//  console.log("Tesseract Data = ",JSON.stringify(data.blocks[0].paragraphs[0].lines));
  
  await worker.terminate();

  const lines = data.blocks?.[0]?.paragraphs?.[0]?.lines ?? [];
  //console.log("Tesseract Lines = ",JSON.stringify(lines));

  // Convert TSV to JSON
  const jsonLines = parseTsvToJson(data.tsv);

  return { lines: jsonLines };
}

function parseTsvToJson(tsv) {
  const lines = tsv.trim().split('\n');
  const result = [];

  for (const line of lines) {
    const columns = line.split('\t');

    // Only process lines with at least 12 columns (text exists at index 11)
    if (columns.length >= 12) {
      const x = parseInt(columns[6]);
      const y = parseInt(columns[7]);
      const width = parseInt(columns[8]);
      const height = parseInt(columns[9]);
      const text = columns[11];

      // Skip if text is empty
      if (text && text.trim() !== '') {
        result.push({ x, y, width, height, text });
      }
    }
  }

  return result;
}
