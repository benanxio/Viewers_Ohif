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

function getLateralityAnchorSide(displaySet, instance): 'L' | 'R' | undefined {
  const laterality =
    instance?.ImageLaterality ||
    instance?.Laterality ||
    displaySet?.Laterality ||
    getLateralityFromImageType(instance);

  if (laterality === 'L' || laterality === 'R') {
    return laterality;
  }
  return undefined;
}

/**
 * Fills the viewport height and pans the given cornerstone3d stack viewport
 * so the tissue side of the image is flush against the matching edge.
 */
export function applyMammographyFit(viewport, displaySet) {
  const instance = getInstance(displaySet);
  const anchorSide = getLateralityAnchorSide(displaySet, instance);

  // eslint-disable-next-line no-console
  console.log('[MastografiaFit] detected', {
    SeriesDescription: instance?.SeriesDescription || displaySet?.SeriesDescription,
    ImageLaterality: instance?.ImageLaterality,
    Laterality: instance?.Laterality ?? displaySet?.Laterality,
    ImageType: instance?.ImageType,
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
  const canvasZero = viewport.worldToCanvas(imageData.indexToWorld([0, 0, 0]));
  const canvasEdge = viewport.worldToCanvas(
    imageData.indexToWorld([dimensions[0], dimensions[1], dimensions[2]])
  );
  const canvasImageLeft = Math.min(canvasZero[0], canvasEdge[0]);
  const canvasImageRight = Math.max(canvasZero[0], canvasEdge[0]);
  const canvasWidth = viewport.canvas.clientWidth;

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
