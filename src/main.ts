import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdfjs/pdf.worker.mjs';

let pdfDocument: pdfjsLib.PDFDocumentProxy;
let currentPage = 1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

let scale = 1.5;

function updatePageInfo(pageInfo: HTMLSpanElement): void {
  pageInfo.textContent = `Page ${currentPage} / ${pdfDocument.numPages}`;
}

function updateNavigationControls(
  previousButton: HTMLButtonElement,
  nextButton: HTMLButtonElement,
): void {
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= pdfDocument.numPages;
}

function handleKeyboardNavigation(
  event: KeyboardEvent,
  pageInfo: HTMLSpanElement,
  previousButton: HTMLButtonElement,
  nextButton: HTMLButtonElement,
): void {
  const target = event.target;

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    void goToPreviousPage(pageInfo, previousButton, nextButton);
  }

  if (event.key === 'ArrowRight') {
    void goToNextPage(pageInfo, previousButton, nextButton);
  }
}
function updateZoomInfo(zoomInfo: HTMLSpanElement): void {
  zoomInfo.textContent = `${Math.round(scale * 100)}%`;
}
async function renderPage(pageNumber: number): Promise<void> {
  const page = await pdfDocument.getPage(pageNumber);

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

  console.log(`Rendered page ${pageNumber}.`);
}

async function goToPreviousPage(
  pageInfo: HTMLSpanElement,
  previousButton: HTMLButtonElement,
  nextButton: HTMLButtonElement,
): Promise<void> {
  if (currentPage <= 1) {
    return;
  }

  currentPage -= 1;

  await renderPage(currentPage);
  updatePageInfo(pageInfo);
  updateNavigationControls(previousButton, nextButton);
}

async function goToNextPage(
  pageInfo: HTMLSpanElement,
  previousButton: HTMLButtonElement,
  nextButton: HTMLButtonElement,
): Promise<void> {
  if (currentPage >= pdfDocument.numPages) {
    return;
  }

  currentPage += 1;

  await renderPage(currentPage);
  updatePageInfo(pageInfo);
  updateNavigationControls(previousButton, nextButton);
}
async function zoomOut(zoomInfo: HTMLSpanElement): Promise<void> {
  if (scale <= MIN_SCALE) {
    return;
  }

  scale = Math.max(MIN_SCALE, scale - SCALE_STEP);

  updateZoomInfo(zoomInfo);
  await renderPage(currentPage);
}
async function zoomIn(zoomInfo: HTMLSpanElement): Promise<void> {
  if (scale >= MAX_SCALE) {
    return;
  }

  scale = Math.min(MAX_SCALE, scale + SCALE_STEP);

  updateZoomInfo(zoomInfo);
  await renderPage(currentPage);
}
async function main(): Promise<void> {
  const previousButton =
    document.querySelector<HTMLButtonElement>('#previous-page');

  const nextButton = document.querySelector<HTMLButtonElement>('#next-page');

  const pageInfo = document.querySelector<HTMLSpanElement>('#page-info');
  const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out');

  const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in');

  const zoomInfo = document.querySelector<HTMLSpanElement>('#zoom-info');
  if (
    !previousButton ||
    !nextButton ||
    !pageInfo ||
    !zoomOutButton ||
    !zoomInButton ||
    !zoomInfo
  ) {
    throw new Error('PDF viewer controls not found.');
  }

  const pdfUrl = './questionnaires/2026S_AM.pdf';

  console.log(`Loading ${pdfUrl}...`);

  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
  });

  pdfDocument = await loadingTask.promise;

  console.log('PDF loaded successfully.');
  console.log(`Pages: ${pdfDocument.numPages}`);

  previousButton.addEventListener('click', () => {
    void goToPreviousPage(pageInfo, previousButton, nextButton);
  });

  nextButton.addEventListener('click', () => {
    void goToNextPage(pageInfo, previousButton, nextButton);
  });
  document.addEventListener('keydown', (event) => {
    handleKeyboardNavigation(event, pageInfo, previousButton, nextButton);
  });

  zoomOutButton.addEventListener('click', () => {
    void zoomOut(zoomInfo);
  });

  zoomInButton.addEventListener('click', () => {
    void zoomIn(zoomInfo);
  });
  updatePageInfo(pageInfo);
  updateNavigationControls(previousButton, nextButton);
  updateZoomInfo(zoomInfo);
  await renderPage(currentPage);
}

main().catch((error: unknown) => {
  console.error('Failed to initialize PDF viewer:', error);
});
