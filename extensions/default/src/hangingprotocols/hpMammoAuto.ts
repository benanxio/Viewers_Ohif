import { Types } from '@ohif/core';

/**
 * Fills the viewport height with the image (crops width if needed) instead
 * of the default "fit whole image, letterboxed" behavior - mirrors the
 * `fitViewportToHeight` toolbar command so auto-hung MG viewports already
 * look zoomed-in like a manual fit would. `dynamicLateralityAnchor` tells
 * CornerstoneViewportService to compute the actual crop anchor per-viewport
 * from each image's laterality (L/R), so the width crop always eats into
 * the empty side of the image and never the breast tissue.
 */
const viewportOptions = {
  toolGroupId: 'default',
  allowUnmatchedView: true,
  displayArea: {
    storeAsInitialCamera: true,
    imageArea: [0.01, 1],
    dynamicLateralityAnchor: true,
  },
};

const defaultDisplaySetId = 'defaultDisplaySetId';

const makeViewport = (matchedDisplaySetsIndex?: number) => ({
  viewportOptions,
  displaySets: [
    matchedDisplaySetsIndex === undefined
      ? { id: defaultDisplaySetId }
      : { id: defaultDisplaySetId, matchedDisplaySetsIndex },
  ],
});

/**
 * Automatically lays out every MG (mammography) study into a grid sized to
 * the number of images available - 1 image shows in 1x1, 2 in 1x2, 3 in 1x3,
 * 4 (or more) in 2x2 - instead of always defaulting to a single viewport.
 */
const hpMammographyAuto: Types.HangingProtocol.Protocol = {
  id: '@ohif/hpMammoAuto',
  name: 'Mastografia Auto Fit',
  protocolMatchingRules: [
    {
      id: 'Mammography',
      weight: 100,
      attribute: 'ModalitiesInStudy',
      constraint: {
        contains: 'MG',
      },
      required: true,
    },
  ],
  toolGroupIds: ['default'],
  displaySetSelectors: {
    [defaultDisplaySetId]: {
      seriesMatchingRules: [
        {
          attribute: 'Modality',
          constraint: {
            equals: 'MG',
          },
          required: true,
        },
        {
          attribute: 'numImageFrames',
          constraint: {
            greaterThan: { value: 0 },
          },
          required: true,
        },
        {
          attribute: 'isDisplaySetFromUrl',
          weight: 20,
          constraint: {
            equals: true,
          },
        },
      ],
    },
  },
  defaultViewport: {
    viewportOptions,
    displaySets: [{ id: defaultDisplaySetId, matchedDisplaySetsIndex: -1 }],
  },
  stages: [
    {
      id: '1x4',
      name: '1x4',
      stageActivation: {
        enabled: {
          minViewportsMatched: 4,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 4,
        },
      },
      viewports: [makeViewport(0), makeViewport(1), makeViewport(2), makeViewport(3)],
    },
    {
      id: '1x3',
      name: '1x3',
      stageActivation: {
        enabled: {
          minViewportsMatched: 3,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 3,
        },
      },
      viewports: [makeViewport(0), makeViewport(1), makeViewport(2)],
    },
    {
      id: '1x2',
      name: '1x2',
      stageActivation: {
        enabled: {
          minViewportsMatched: 2,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [makeViewport(0), makeViewport(1)],
    },
    {
      id: '1x1',
      name: '1x1',
      stageActivation: {
        enabled: {
          minViewportsMatched: 1,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [makeViewport()],
    },
  ],
  numberOfPriorsReferenced: -1,
};

export default hpMammographyAuto;
