// route.js
import { NextResponse } from 'next/server';
import { convertPdfToImages } from '@/app/lib/pdfToImages';

export const maxDuration = 300; // Set timeout to 5 minutes for large PDFs

export async function POST(request) {
  try {
    // For FormData approach (if sending PDF as file)
    const formData = await request.formData();
    const pdfFile = formData.get('file');
    
    if (!pdfFile) {
      return NextResponse.json({ 
        success: false, 
        error: 'No PDF file provided' 
      }, { status: 400 });
    }
    
    // Convert the file to ArrayBuffer and then to Buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    // Call the extraction utility
    const { numPages, imageBuffers } = await convertPdfToImages(pdfBuffer);
    
    // Create image URLs for the response (using base64 encoding)
    const images = imageBuffers.map((buffer, index) => {
      // Convert buffer to base64 data URL
      const base64Image = buffer.toString('base64');
      return {
        index: index + 1,
        dataUrl: `data:image/png;base64,${base64Image}`
      };
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully converted ${numPages} pages`,
      images: images,
      numPages: numPages
    });
  } catch (error) {
    console.error('PDF conversion failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}