import { Enums } from '@cornerstonejs/core';

const MIP = 'mip';
const MINIP = 'minip';
const AVG = 'avg';

export default function getCornerstoneBlendMode(blendMode: string): Enums.BlendModes {
  if (!blendMode) {
    return Enums.BlendModes.COMPOSITE;
  }

  if (blendMode.toLowerCase() === MIP) {
    return Enums.BlendModes.MAXIMUM_INTENSITY_BLEND;
  }

  if (blendMode.toLowerCase() === MINIP) {
    return Enums.BlendModes.MINIMUM_INTENSITY_BLEND;
  }

  if (blendMode.toLowerCase() === AVG) {
    return Enums.BlendModes.AVERAGE_INTENSITY_BLEND;
  }

  throw new Error(`Unsupported blend mode: ${blendMode}`);
}

/**
 * Inverse of getCornerstoneBlendMode: turns the enum a viewport reports back
 * into the string the UI works with, so a control can show which mode is
 * actually active instead of assuming one.
 */
export function getBlendModeString(blendMode: Enums.BlendModes): string {
  switch (blendMode) {
    case Enums.BlendModes.MINIMUM_INTENSITY_BLEND:
      return MINIP;
    case Enums.BlendModes.AVERAGE_INTENSITY_BLEND:
      return AVG;
    default:
      return MIP;
  }
}
