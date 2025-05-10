async function processMessage({ prompt, file }: { prompt: string; file: File }){
  try {
    const response = await fetch('/api/ocr-chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        file,
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const reader = response.body?.getReader();
    let result = '';
    while (true) {
      const { done, value } = await reader!.read();
      if (done) {
        break;
      }
      result += new TextDecoder().decode(value);
    }

    return result;
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}