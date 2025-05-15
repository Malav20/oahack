// pdfConverter.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium'
// Add type declarations for PDF.js library
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

/**
 * Converts a PDF buffer to an array of image buffers
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @returns {Promise<{numPages: number, imageBuffers: Buffer[], dimensions: {width: number, height: number, scale: number}[]}>} - Array of image buffers and dimensions, one for each page
 */
export async function convertPdfToImages(pdfBuffer) {
  // Launch Puppeteer
  // const browser = await puppeteer.launch({
  //   headless: 'new',
  //   args: ['--no-sandbox', '--disable-setuid-sandbox']
  // });

  const browser = await puppeteer.launch({
    args: puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    executablePath: await chromium.executablePath(),
    headless: "shell",
  })

  try {
    // Create a new page
    const page = await browser.newPage();

    // Set viewport to a reasonably large size
    await page.setViewport({ width: 1920, height: 1080 });

    // Create a data URL from the PDF buffer
    const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    // Navigate to blank page
    await page.goto('about:blank');

    // Inject PDF.js viewer
    await page.evaluate(`
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      document.head.appendChild(script);
    `);

    // Wait for PDF.js to load
    await page.waitForFunction(() => window.pdfjsLib !== undefined);

    // Get number of pages
    const numPages = await page.evaluate(async (pdfDataUrl) => {
      // Load the PDF document
      const loadingTask = window.pdfjsLib.getDocument({ data: atob(pdfDataUrl.split(',')[1]) });
      const pdf = await loadingTask.promise;
      return pdf.numPages;
    }, pdfDataUrl);

    // Convert each page to an image
    const imageBuffers = [];
    const dimensions = [];

    for (let i = 1; i <= numPages; i++) {
      // Render the current page
      const pageDimensions = await page.evaluate(async (pdfDataUrl, pageNum) => {
        // Clear previous content
        document.body.innerHTML = '';

        // Create a new canvas
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        // Load the PDF document
        const loadingTask = window.pdfjsLib.getDocument({ data: atob(pdfDataUrl.split(',')[1]) });
        const pdf = await loadingTask.promise;

        // Get the page
        const page = await pdf.getPage(pageNum);

        // Determine scale to fit the page properly
        const viewport = page.getViewport({ scale: 1.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render the page
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        // Return the actual dimensions and scale used for rendering
        return {
          width: viewport.width,
          height: viewport.height,
          scale: 1.0,
          originalWidth: viewport.width,
          originalHeight: viewport.height
        };
      }, pdfDataUrl, i);

      // Take a screenshot of the rendered PDF page
      const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage: true
      });

      imageBuffers.push(imageBuffer);
      dimensions.push(pageDimensions);
    }

    return {
      numPages,
      imageBuffers,
      dimensions
    };
  } finally {
    await browser.close();
  }
}