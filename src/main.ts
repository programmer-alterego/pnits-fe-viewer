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
  statusElement: HTMLParagraphElement,
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
    void goToPreviousPage(pageInfo, previousButton, nextButton, statusElement);
  }

  if (event.key === 'ArrowRight') {
    void goToNextPage(pageInfo, previousButton, nextButton, statusElement);
  }
}

function updateZoomInfo(zoomInfo: HTMLSpanElement): void {
  zoomInfo.textContent = `${Math.round(scale * 100)}%`;
}

function setViewerStatus(
  statusElement: HTMLParagraphElement,
  message: string,
): void {
  statusElement.hidden = false;
  statusElement.textContent = message;
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
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (currentPage <= 1) {
    return;
  }
  const targetPage = currentPage - 1;

  const rendered = await renderCurrentPage(targetPage, statusElement);

  if (!rendered) {
    return;
  }

  currentPage = targetPage;

  updatePageInfo(pageInfo);
  updateNavigationControls(previousButton, nextButton);
}

async function goToNextPage(
  pageInfo: HTMLSpanElement,
  previousButton: HTMLButtonElement,
  nextButton: HTMLButtonElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (currentPage >= pdfDocument.numPages) {
    return;
  }
  const targetPage = currentPage + 1;

  const rendered = await renderCurrentPage(targetPage, statusElement);

  if (!rendered) {
    return;
  }

  currentPage = targetPage;

  updatePageInfo(pageInfo);
  updateNavigationControls(previousButton, nextButton);
}

async function zoomOut(
  zoomInfo: HTMLSpanElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (scale <= MIN_SCALE) {
    return;
  }

  const previousScale = scale;
  scale = Math.max(MIN_SCALE, scale - SCALE_STEP);

  if (!(await renderCurrentPage(currentPage, statusElement))) {
    scale = previousScale;
    return;
  }

  updateZoomInfo(zoomInfo);
}

async function zoomIn(
  zoomInfo: HTMLSpanElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (scale >= MAX_SCALE) {
    return;
  }

  const previousScale = scale;
  scale = Math.max(MIN_SCALE, scale + SCALE_STEP);

  if (!(await renderCurrentPage(currentPage, statusElement))) {
    scale = previousScale;
    return;
  }

  updateZoomInfo(zoomInfo);
}

async function renderCurrentPage(
  pageNumber: number,
  statusElement: HTMLParagraphElement,
): Promise<boolean> {
  try {
    await renderPage(pageNumber);

    statusElement.hidden = true;
    return true;
  } catch (error: unknown) {
    console.error(`Failed to render page ${pageNumber}:`, error);

    setViewerStatus(statusElement, `Failed to render page ${pageNumber}.`);
    return false;
  }
}

async function main(): Promise<void> {
  const statusElement =
    document.querySelector<HTMLParagraphElement>('#viewer-status');
  const previousButton =
    document.querySelector<HTMLButtonElement>('#previous-page');
  const nextButton = document.querySelector<HTMLButtonElement>('#next-page');
  const pageInfo = document.querySelector<HTMLSpanElement>('#page-info');
  const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out');
  const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in');
  const zoomInfo = document.querySelector<HTMLSpanElement>('#zoom-info');

  if (
    !statusElement ||
    !previousButton ||
    !nextButton ||
    !pageInfo ||
    !zoomOutButton ||
    !zoomInButton ||
    !zoomInfo
  ) {
    throw new Error('PDF viewer controls not found.');
  }

  try {
    // PDF initialization
    setViewerStatus(statusElement, 'Loading PDF...');
    const pdfUrl = './questionnaires/2026S_AM.pdf';

    console.log(`Loading ${pdfUrl}...`);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
    });

    pdfDocument = await loadingTask.promise;
    console.log('PDF loaded successfully.');
    console.log(`Pages: ${pdfDocument.numPages}`);

    previousButton.addEventListener('click', () => {
      void goToPreviousPage(
        pageInfo,
        previousButton,
        nextButton,
        statusElement,
      );
    });

    nextButton.addEventListener('click', () => {
      void goToNextPage(pageInfo, previousButton, nextButton, statusElement);
    });

    document.addEventListener('keydown', (event) => {
      handleKeyboardNavigation(
        event,
        pageInfo,
        previousButton,
        nextButton,
        statusElement,
      );
    });

    zoomOutButton.addEventListener('click', () => {
      void zoomOut(zoomInfo, statusElement);
    });

    zoomInButton.addEventListener('click', () => {
      void zoomIn(zoomInfo, statusElement);
    });

    updatePageInfo(pageInfo);
    updateNavigationControls(previousButton, nextButton);
    updateZoomInfo(zoomInfo);
    await renderCurrentPage(currentPage, statusElement);
  } catch (error: unknown) {
    console.error('Failed to initialize PDF viewer:', error);

    setViewerStatus(statusElement, 'Failed to load the PDF. Please try again.');
  }
}

void main();
