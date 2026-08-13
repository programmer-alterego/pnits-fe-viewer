import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdfjs/pdf.worker.mjs';

async function main(): Promise<void> {
  const pdfUrl = './questionnaires/2026S_AM.pdf';

  console.log(`Loading ${pdfUrl}...`);

  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
  });

  const pdf = await loadingTask.promise;

  console.log('PDF loaded successfully.');
  console.log(`Pages: ${pdf.numPages}`);

  const page = await pdf.getPage(1);

  console.log('Page 1 loaded.');

  const scale = 1.5;
  const viewport = page.getViewport({
    scale,
  });

  const canvas = document.querySelector<HTMLCanvasElement>('#pdf-canvas');

  if (!canvas) {
    throw new Error('PDF canvas not found.');
  }

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get 2D canvas context.');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  console.log('Page 1 rendered successfully.');
}

main().catch((error: unknown) => {
  console.error('Failed to initialize PDF viewer:', error);
});
