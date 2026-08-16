import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdfjs/pdf.worker.mjs';

let pdfDocument: pdfjsLib.PDFDocumentProxy;
let currentPage = 1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;
let renderRequestId = 0;
let scale = 1.5;

interface ZoomPoint {
  x: number;
  y: number;
}

function updatePageInfo(
  pageNumberInput: HTMLInputElement,
  pageCount: HTMLSpanElement,
): void {
  pageNumberInput.value = String(currentPage);
  pageNumberInput.max = String(pdfDocument.numPages);

  pageCount.textContent = `/ ${pdfDocument.numPages}`;
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
  pageNumberInput: HTMLInputElement,
  pageCount: HTMLSpanElement,
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
    void goToPreviousPage(
      pageNumberInput,
      pageCount,
      previousButton,
      nextButton,
      statusElement,
    );
  }

  if (event.key === 'ArrowRight') {
    void goToNextPage(
      pageNumberInput,
      pageCount,
      previousButton,
      nextButton,
      statusElement,
    );
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

async function renderPage(
  pageNumber: number,
  requestId: number,
): Promise<boolean> {
  const page = await pdfDocument.getPage(pageNumber);
  if (requestId !== renderRequestId) {
    return false;
  }
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

  if (requestId !== renderRequestId) {
    return false;
  }

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  if (requestId !== renderRequestId) {
    return false;
  }

  console.log(`Rendered page ${pageNumber}.`);
  return true;
}

async function goToPreviousPage(
  pageNumberInput: HTMLInputElement,
  pageCount: HTMLSpanElement,
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

  updatePageInfo(pageNumberInput, pageCount);
  updateNavigationControls(previousButton, nextButton);
}

async function goToNextPage(
  pageNumberInput: HTMLInputElement,
  pageCount: HTMLSpanElement,
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

  updatePageInfo(pageNumberInput, pageCount);
  updateNavigationControls(previousButton, nextButton);
}

function getViewportCenter(container: HTMLDivElement): ZoomPoint {
  return {
    x: container.clientWidth / 2,
    y: container.clientHeight / 2,
  };
}

async function zoomOut(
  zoomInfo: HTMLSpanElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (scale <= MIN_SCALE) {
    return;
  }

  const container = getPdfContainer();

  const zoomPoint = getViewportCenter(container);

  const newScale = Math.max(MIN_SCALE, scale - SCALE_STEP);

  await zoomTo(newScale, zoomPoint, zoomInfo, statusElement);
}

async function zoomIn(
  zoomInfo: HTMLSpanElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (scale >= MAX_SCALE) {
    return;
  }

  const container = getPdfContainer();

  const zoomPoint = getViewportCenter(container);

  const newScale = Math.min(MAX_SCALE, scale + SCALE_STEP);

  await zoomTo(newScale, zoomPoint, zoomInfo, statusElement);
}

async function zoomTo(
  newScale: number,
  zoomPoint: ZoomPoint,
  zoomInfo: HTMLSpanElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  const container = getPdfContainer();

  const oldScale = scale;

  const documentX = container.scrollLeft + zoomPoint.x;

  const documentY = container.scrollTop + zoomPoint.y;

  const scaleRatio = newScale / oldScale;

  scale = newScale;

  updateZoomInfo(zoomInfo);

  await renderCurrentPage(currentPage, statusElement);

  container.scrollLeft = documentX * scaleRatio - zoomPoint.x;

  container.scrollTop = documentY * scaleRatio - zoomPoint.y;
}

async function renderCurrentPage(
  pageNumber: number,
  statusElement: HTMLParagraphElement,
): Promise<boolean> {
  const requestId = ++renderRequestId;
  try {
    const rendered = await renderPage(pageNumber, requestId);
    if (!rendered) {
      return false;
    }

    statusElement.hidden = true;
    return true;
  } catch (error: unknown) {
    if (requestId !== renderRequestId) {
      return false;
    }

    console.error(`Failed to render page ${pageNumber}:`, error);

    setViewerStatus(statusElement, `Failed to render page ${pageNumber}.`);

    return false;
  }
}

async function goToPage(
  pageNumber: number,
  pageNumberInput: HTMLInputElement,
  pageCount: HTMLSpanElement,
  previousButton: HTMLButtonElement,
  nextButton: HTMLButtonElement,
  statusElement: HTMLParagraphElement,
): Promise<void> {
  if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
    return;
  }

  if (pageNumber === currentPage) {
    return;
  }

  const rendered = await renderCurrentPage(pageNumber, statusElement);

  if (!rendered) {
    updatePageInfo(pageNumberInput, pageCount);
    return;
  }

  currentPage = pageNumber;

  updatePageInfo(pageNumberInput, pageCount);
  updateNavigationControls(previousButton, nextButton);
}

function getPdfContainer(): HTMLDivElement {
  const container = document.querySelector<HTMLDivElement>('.pdf-container');

  if (!container) {
    throw new Error('PDF container not found.');
  }

  return container;
}

async function main(): Promise<void> {
  const statusElement =
    document.querySelector<HTMLParagraphElement>('#viewer-status');
  const previousButton =
    document.querySelector<HTMLButtonElement>('#previous-page');
  const nextButton = document.querySelector<HTMLButtonElement>('#next-page');
  const pageNumberInput =
    document.querySelector<HTMLInputElement>('#page-number');
  const pageCount = document.querySelector<HTMLSpanElement>('#page-count');
  const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out');
  const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in');
  const zoomInfo = document.querySelector<HTMLSpanElement>('#zoom-info');

  if (
    !statusElement ||
    !previousButton ||
    !nextButton ||
    !pageNumberInput ||
    !pageCount ||
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
        pageNumberInput,
        pageCount,
        previousButton,
        nextButton,
        statusElement,
      );
    });

    nextButton.addEventListener('click', () => {
      void goToNextPage(
        pageNumberInput,
        pageCount,
        previousButton,
        nextButton,
        statusElement,
      );
    });

    document.addEventListener('keydown', (event) => {
      handleKeyboardNavigation(
        event,
        pageNumberInput,
        pageCount,
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

    pageNumberInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      const pageNumber = Number(pageNumberInput.value);

      if (!Number.isInteger(pageNumber)) {
        updatePageInfo(pageNumberInput, pageCount);
        return;
      }

      void goToPage(
        pageNumber,
        pageNumberInput,
        pageCount,
        previousButton,
        nextButton,
        statusElement,
      );
    });

    updatePageInfo(pageNumberInput, pageCount);
    updateNavigationControls(previousButton, nextButton);
    updateZoomInfo(zoomInfo);
    await renderCurrentPage(currentPage, statusElement);
  } catch (error: unknown) {
    console.error('Failed to initialize PDF viewer:', error);

    setViewerStatus(statusElement, 'Failed to load the PDF. Please try again.');
  }
}

void main();
