export async function tesseractOCR(imageBuffer: Buffer): Promise<{ lines: any[] }> {
  // Import dynamically only when needed
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker("eng", 1, {
    workerPath: "./node_modules/tesseract.js/src/worker-script/node/index.js",
  });

  // Request TSV output
  const { data } = await worker.recognize(imageBuffer, {}, { tsv: true, hocr: true, blocks: true });
  console.log("Tesseract Data = ",JSON.stringify(data.blocks[0].paragraphs[0].lines));

  // Parse TSV output for word coordinates
  const tsv = data.tsv;
  
  await worker.terminate();

  const lines = data.blocks?.[0]?.paragraphs?.[0]?.lines ?? [];
  console.log("Tesseract Lines = ",JSON.stringify(lines));
  return { lines };
}