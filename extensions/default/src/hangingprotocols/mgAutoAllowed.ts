/**
 * Study-level `sede_id` values (numeric) for which the MG auto layout must NOT
 * be applied. Add the numeric id of a site here to opt it out of the
 * `@ohif/hpMammoAuto` protocol entirely (grid + laterality fit); those studies
 * then fall back to the default hanging protocol.
 */
const MG_AUTO_EXCLUDED_SEDE_IDS: number[] = [20, 11, 25];

/**
 * Reads the study's `sede_id`. The dicomjson data source spreads study-level
 * fields onto every instance, so the id is available both on the study and on
 * each display set's images; we accept whichever is present.
 */
function readSedeId(study, options): number | undefined {
  let raw = study?.sede_id;

  if (raw == null) {
    const displaySets = options?.displaySets || [];
    for (const ds of displaySets) {
      const candidate = ds?.images?.[0]?.sede_id ?? ds?.instances?.[0]?.sede_id;
      if (candidate != null) {
        raw = candidate;
        break;
      }
    }
  }

  const sedeId = Number(raw);
  return Number.isFinite(sedeId) ? sedeId : undefined;
}

/**
 * Hanging-protocol custom attribute. Returns `true` when the MG auto layout is
 * allowed for the study's site, `false` when the site is excluded. When no
 * `sede_id` is present it returns `true` (normal behavior), so nothing changes
 * for studies that don't carry the field.
 */
export default function mgAutoAllowed(study, options): boolean {
  const sedeId = readSedeId(study, options);
  if (sedeId === undefined) {
    return true;
  }
  return !MG_AUTO_EXCLUDED_SEDE_IDS.includes(sedeId);
}
