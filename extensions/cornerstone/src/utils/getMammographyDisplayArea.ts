/**
 * Forces the image to fill 100% of the viewport HEIGHT (not just its own
 * default "fit to window" size, which can leave vertical letterboxing too),
 * cropping width as needed, then pans the image so its edge/corner on the
 * side that holds the breast tissue/chest wall sits flush against the
 * matching viewport edge - pushing all the empty margin to the other side.
 * That side is inferred from laterality: 'L' anchors to the left edge, 'R'
 * to the right edge, and unknown leaves it centered.
 *
 * Since ImageLaterality/Laterality often aren't forwarded by some data
 * sources, this also falls back to reading the last value of ImageType
 * (0008,0008), which some systems use to carry "LEFT"/"RIGHT" instead.
 *
 * The pan is computed by directly measuring where the image actually lands
 * on screen (via worldToCanvas) and correcting by the exact pixel error,
 * rather than relying on cornerstone3d's `displayArea.imageCanvasPoint`
 * formula, whose pan direction/units proved unreliable to predict here.
 */
import { metaData } from '@cornerstonejs/core';

function getInstance(displaySet) {
  return displaySet?.images?.[0] ?? displaySet?.instances?.[0];
}

function getLateralityFromImageType(instance): string | undefined {
  const imageType: string[] | undefined = instance?.ImageType;
  const lastValue = imageType?.[imageType.length - 1]?.toUpperCase();

  if (lastValue === 'RIGHT') {
    return 'R';
  }
  if (lastValue === 'LEFT') {
    return 'L';
  }
  return undefined;
}

/**
 * Multiframe / enhanced MG objects (e.g. tomosynthesis and their synthetic 2D
 * images) don't carry ImageLaterality (0020,0062) at the top level; the side
 * lives in FrameLaterality (0020,9072) inside the Shared Functional Groups.
 */
function getFrameLaterality(instance): string | undefined {
  return instance?.SharedFunctionalGroupsSequence?.[0]?.FrameAnatomySequence?.[0]
    ?.FrameLaterality;
}

function getLateralityAnchorSide(displaySet, instance): 'L' | 'R' | undefined {
  const laterality =
    instance?.ImageLaterality ||
    instance?.Laterality ||
    displaySet?.Laterality ||
    getFrameLaterality(instance) ||
    getLateralityFromImageType(instance);

  if (laterality === 'L' || laterality === 'R') {
    return laterality;
  }
  return undefined;
}

/**
 * PatientOrientation (0020,0020) dice hacia dónde avanzan las columnas de la imagen.
 * 'A' = hacia anterior (pezón), así que la pared torácica queda a la izquierda;
 * 'P' = hacia posterior, la pared torácica queda a la derecha. No depende de cómo
 * guarde el equipo cada mama, a diferencia de la lateralidad.
 */
function getOrientationAnchorSide(instance): 'L' | 'R' | undefined {
  const orientation = instance?.PatientOrientation;
  const rowDirection = (Array.isArray(orientation) ? orientation[0] : String(orientation ?? '').split('\\')[0])
    ?.toUpperCase?.();

  if (rowDirection === 'A') {
    return 'L';
  }
  if (rowDirection === 'P') {
    return 'R';
  }
  return undefined;
}

/**
 * Detecta en los píxeles de la imagen de qué lado está el tejido: compara una franja
 * del borde izquierdo con una del derecho. El aire es casi plano (poca variación) y
 * el lado de la pared torácica tiene tejido. Sirve aunque el JSON no traiga
 * lateralidad ni PatientOrientation (estudios viejos, node_app sin esos tags).
 */
function getTissueSideFromPixels(viewport): 'L' | 'R' | undefined {
  const image = viewport.getCornerstoneImage?.();
  const pixelData = image?.getPixelData?.();
  const { rows, columns } = image ?? {};

  if (!pixelData || !rows || !columns || image.color || pixelData.length < rows * columns) {
    return undefined;
  }

  const stripWidth = Math.max(1, Math.round(columns * 0.08));
  const rowStep = Math.max(1, Math.floor(rows / 300));
  const colStep = Math.max(1, Math.floor(stripWidth / 30));

  const stripStdDev = startColumn => {
    let count = 0;
    let sum = 0;
    let sumSquares = 0;
    for (let row = 0; row < rows; row += rowStep) {
      const rowOffset = row * columns;
      for (let col = startColumn; col < startColumn + stripWidth; col += colStep) {
        const value = pixelData[rowOffset + col];
        sum += value;
        sumSquares += value * value;
        count++;
      }
    }
    const mean = sum / count;
    return Math.sqrt(Math.max(0, sumSquares / count - mean * mean));
  };

  const left = stripStdDev(0);
  const right = stripStdDev(columns - stripWidth);

  // Solo si la diferencia es clara; si no, mejor no adivinar
  if (left > right * 1.5) {
    return 'L';
  }
  if (right > left * 1.5) {
    return 'R';
  }
  return undefined;
}

/**
 * Fracción del ancho de la imagen que ocupa el tejido, medida desde la pared
 * torácica (anchorSide) hasta la columna más lejana con tejido (el pezón).
 * Una columna cuenta como tejido si más del 15% de sus filas difiere del fondo
 * (aire); así no cuentan las etiquetas quemadas tipo "R CC" del lado del aire.
 */
function getTissueExtentFromPixels(viewport, anchorSide: 'L' | 'R'): number | undefined {
  const image = viewport.getCornerstoneImage?.();
  const pixelData = image?.getPixelData?.();
  const { rows, columns } = image ?? {};

  if (!pixelData || !rows || !columns || image.color || pixelData.length < rows * columns) {
    return undefined;
  }

  const rowStep = Math.max(1, Math.floor(rows / 300));
  const colStep = Math.max(1, Math.floor(columns / 400));
  const sampledRows = Math.ceil(rows / rowStep);
  const sampledCols = Math.ceil(columns / colStep);
  const samples = new Float32Array(sampledRows * sampledCols);
  let k = 0;
  for (let r = 0; r < rows; r += rowStep) {
    for (let c = 0; c < columns; c += colStep) {
      samples[k++] = pixelData[r * columns + c];
    }
  }

  // Fondo = mediana de la franja del lado del aire (el opuesto a la pared torácica)
  const stripCols = Math.max(1, Math.round(sampledCols * 0.08));
  const air = [];
  for (let r = 0; r < sampledRows; r++) {
    for (let i = 0; i < stripCols; i++) {
      const c = anchorSide === 'L' ? sampledCols - 1 - i : i;
      air.push(samples[r * sampledCols + c]);
    }
  }
  air.sort((a, b) => a - b);
  const background = air[Math.floor(air.length / 2)];

  const sorted = Float32Array.from(samples).sort();
  const range = sorted[Math.floor(sorted.length * 0.99)] - sorted[Math.floor(sorted.length * 0.01)];
  if (!(range > 0)) {
    return undefined;
  }
  const threshold = range * 0.05;

  let farthest = -1;
  for (let i = 0; i < sampledCols; i++) {
    const c = anchorSide === 'L' ? i : sampledCols - 1 - i;
    let tissueRows = 0;
    for (let r = 0; r < sampledRows; r++) {
      if (Math.abs(samples[r * sampledCols + c] - background) > threshold) {
        tissueRows++;
      }
    }
    if (tissueRows > sampledRows * 0.15) {
      farthest = i;
    }
  }

  return farthest < 0 ? undefined : (farthest + 1) / sampledCols;
}

/**
 * Public entry point. Wraps the fit in a try/catch so that any unexpected
 * failure (missing viewport APIs, geometry errors, unusual metadata, etc.)
 * degrades to a no-op instead of rejecting the setStack promise and breaking
 * the viewport mount.
 *
 * Per-site opt-out (grid + fit) is handled upstream by the `mgAutoAllowed`
 * hanging-protocol attribute, which prevents `@ohif/hpMammoAuto` from matching
 * for excluded sites so they fall back to the default protocol entirely.
 */
export function applyMammographyFit(viewport, displaySet) {
  try {
    applyMammographyFitInternal(viewport, displaySet);
    fittedCameras.set(viewport, cameraSnapshot(viewport));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[MastografiaFit] skipped (error)', error);
  }
}

// Cámara que dejó el último ajuste de cada viewport, para saber si el usuario
// la movió después (zoom/pan manual) o sigue tal cual quedó el ajuste
const fittedCameras = new WeakMap();

function cameraSnapshot(viewport) {
  const { parallelScale, focalPoint } = viewport.getCamera();
  return { parallelScale, focalPoint: [...focalPoint] };
}

/**
 * true si el viewport tiene el ajuste de mamografía y nadie lo tocó desde entonces.
 * Al cambiar el tamaño de la ventana (abrir/cerrar paneles) esos viewports se
 * vuelven a ajustar; los que el usuario movió a mano se respetan.
 */
export function isMammographyFitIntact(viewport): boolean {
  const fitted = fittedCameras.get(viewport);
  if (!fitted) {
    return false;
  }
  const current = cameraSnapshot(viewport);
  const tolerance = Math.max(1e-6, fitted.parallelScale * 1e-4);
  return (
    Math.abs(current.parallelScale - fitted.parallelScale) <= tolerance &&
    current.focalPoint.every((value, i) => Math.abs(value - fitted.focalPoint[i]) <= tolerance)
  );
}

/**
 * Fills the viewport height and pans the given cornerstone3d stack viewport
 * so the tissue side of the image is flush against the matching edge.
 */
function applyMammographyFitInternal(viewport, displaySet) {
  // En pilas (tomosíntesis) se usa la imagen que está mostrando el viewport
  const currentImageId = viewport.getCurrentImageId?.();
  const instance =
    (currentImageId && metaData.get('instance', currentImageId)) || getInstance(displaySet);
  const orientationSide = getOrientationAnchorSide(instance);
  const pixelSide = orientationSide ? undefined : getTissueSideFromPixels(viewport);
  const lateralitySide = getLateralityAnchorSide(displaySet, instance);
  const anchorSide = orientationSide || pixelSide || lateralitySide;

  // eslint-disable-next-line no-console
  console.log('[MastografiaFit] detected', {
    SeriesDescription: instance?.SeriesDescription || displaySet?.SeriesDescription,
    ImageLaterality: instance?.ImageLaterality,
    Laterality: instance?.Laterality ?? displaySet?.Laterality,
    ImageType: instance?.ImageType,
    PatientOrientation: instance?.PatientOrientation,
    orientationSide,
    pixelSide,
    lateralitySide,
    anchorSide,
  });

  viewport.setDisplayArea({
    storeAsInitialCamera: true,
    imageArea: [0.01, 1],
  });

  if (!anchorSide) {
    return;
  }

  const imageData = viewport.getDefaultImageData?.();
  if (!imageData) {
    return;
  }

  const dimensions = imageData.getDimensions();
  const canvasWidth = viewport.canvas.clientWidth;
  const measureImageOnCanvas = () => {
    const canvasZero = viewport.worldToCanvas(imageData.indexToWorld([0, 0, 0]));
    const canvasEdge = viewport.worldToCanvas(
      imageData.indexToWorld([dimensions[0], dimensions[1], dimensions[2]])
    );
    return [Math.min(canvasZero[0], canvasEdge[0]), Math.max(canvasZero[0], canvasEdge[0])];
  };

  // Llenar el alto puede dejar la mama más ancha que el viewport (p. ej. tomosíntesis
  // en 4 ventanas): en ese caso se aleja lo justo para que el tejido entre completo
  const tissueExtent = getTissueExtentFromPixels(viewport, anchorSide);
  if (tissueExtent) {
    const [left, right] = measureImageOnCanvas();
    const tissueCanvasWidth = (right - left) * tissueExtent;
    const maxTissueWidth = canvasWidth * 0.97;
    if (tissueCanvasWidth > maxTissueWidth) {
      const camera = viewport.getCamera();
      viewport.setCamera({
        parallelScale: camera.parallelScale * (tissueCanvasWidth / maxTissueWidth),
      });
    }
    // eslint-disable-next-line no-console
    console.log('[MastografiaFit] tissue', { tissueExtent, tissueCanvasWidth, canvasWidth });
  }

  const [canvasImageLeft, canvasImageRight] = measureImageOnCanvas();

  const deltaX = anchorSide === 'L' ? 0 - canvasImageLeft : canvasWidth - canvasImageRight;

  // eslint-disable-next-line no-console
  console.log('[MastografiaFit] measured', {
    canvasImageLeft,
    canvasImageRight,
    canvasWidth,
    deltaX,
  });

  if (Math.abs(deltaX) < 1) {
    return;
  }

  const currentPan = viewport.getPan();
  viewport.setPan([currentPan[0] + deltaX, currentPan[1]]);
}
