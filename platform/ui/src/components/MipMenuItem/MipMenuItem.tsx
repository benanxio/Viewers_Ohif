import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useViewportGrid } from '../../contextProviders';

const MIN_THICKNESS = 0.1;
const MAX_THICKNESS = 50;
const STEP = 0.1;

const BLEND_MODES = [
  { value: 'mip', label: 'MIP', description: 'Máxima intensidad' },
  { value: 'minip', label: 'MinIP', description: 'Mínima intensidad' },
  { value: 'avg', label: 'Mean', description: 'Intensidad media' },
];

// avoids floating point drift (0.1 + 0.1 + 0.1 = 0.30000000000000004)
function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Slab thickness + projection mode controls, rendered inside the Crosshairs
 * split button dropdown. Only meaningful on MPR (volume) viewports, which is
 * what the Crosshairs button itself already gates on.
 *
 * Clicks are stopped from bubbling because ListMenu collapses the dropdown on
 * any item click, which would close the menu mid-drag on the slider.
 */
function MipMenuItem({ servicesManager, commandsManager }: withAppTypes) {
  const { cornerstoneViewportService } = servicesManager?.services ?? {};
  const [viewportGrid] = useViewportGrid();
  const { activeViewportId } = viewportGrid;

  const [thickness, setThickness] = useState(MIN_THICKNESS);
  const [blendMode, setBlendMode] = useState('mip');

  // Resolved on every render rather than cached in state: enabling MPR swaps the
  // stack viewports for volume ones while keeping the same viewport ids, so an
  // effect keyed on activeViewportId would never re-run and this would stay false
  // even once the MPR views are up.
  const viewport = cornerstoneViewportService?.getCornerstoneViewport(activeViewportId);
  const isVolumeViewport = typeof viewport?.setBlendMode === 'function';

  // Both values are read back from the viewport so the controls show what is
  // actually applied rather than whatever was picked last. The blend mode comes
  // through a command because cornerstone reports it as an enum, and translating
  // that here would drag a cornerstone dependency into this library.
  useEffect(() => {
    if (!isVolumeViewport) {
      return;
    }

    setThickness(round1(Math.max(viewport.getSlabThickness() ?? MIN_THICKNESS, MIN_THICKNESS)));
    setBlendMode(
      commandsManager?.runCommand('getViewportBlendMode', { viewportId: activeViewportId }) ?? 'mip'
    );
  }, [activeViewportId, isVolumeViewport]);

  const apply = useCallback(
    (nextThickness: number, nextBlendMode: string) => {
      commandsManager?.runCommand('setViewportBlendModeAndThickness', {
        viewportId: activeViewportId,
        blendMode: nextBlendMode,
        slabThickness: nextThickness,
      });
    },
    [activeViewportId, commandsManager]
  );

  const setThicknessTo = (value: number) => {
    if (Number.isNaN(value)) {
      return;
    }
    const next = Math.min(MAX_THICKNESS, Math.max(MIN_THICKNESS, round1(value)));
    setThickness(next);
    apply(next, blendMode);
  };

  const onBlendModeChange = (value: string) => {
    setBlendMode(value);
    apply(thickness, value);
  };

  if (!isVolumeViewport) {
    return (
      <div className="text-aqua-pale w-[220px] p-3 text-sm">
        Activa el layout MPR para ajustar la proyección.
      </div>
    );
  }

  const percentage = ((thickness - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100;

  return (
    <div
      className="w-[220px] p-3"
      onClick={e => e.stopPropagation()}
    >
      <label className="text-common-bright mb-1 block text-sm">Grosor de corte</label>

      <input
        type="range"
        className="bg-inputfield-main h-2 w-full cursor-pointer appearance-none rounded-lg"
        min={MIN_THICKNESS}
        max={MAX_THICKNESS}
        step={STEP}
        value={thickness}
        onChange={e => setThicknessTo(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(to right, #5acce6 0%, #5acce6 ${percentage}%, #3a3f99 ${percentage}%, #3a3f99 100%)`,
          '--thumb-inner-color': '#5acce6',
          '--thumb-outer-color': '#090c29',
        } as React.CSSProperties}
      />

      <div className="mt-2 mb-3 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Disminuir grosor"
          disabled={thickness <= MIN_THICKNESS}
          className="bg-primary-dark hover:bg-primary-main flex h-7 w-7 items-center justify-center rounded text-lg leading-none disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setThicknessTo(thickness - STEP)}
        >
          −
        </button>
        <span className="text-primary-active w-16 text-center text-sm tabular-nums">
          {thickness.toFixed(1)} mm
        </span>
        <button
          type="button"
          aria-label="Aumentar grosor"
          disabled={thickness >= MAX_THICKNESS}
          className="bg-primary-dark hover:bg-primary-main flex h-7 w-7 items-center justify-center rounded text-lg leading-none disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setThicknessTo(thickness + STEP)}
        >
          +
        </button>
      </div>

      <div className="text-common-bright mb-1 text-sm">Modo de proyección</div>
      {BLEND_MODES.map(mode => (
        <div
          key={mode.value}
          className={classNames(
            'flex cursor-pointer flex-row items-center rounded p-2',
            blendMode === mode.value ? 'bg-primary-dark' : 'hover:bg-primary-dark/50'
          )}
          onClick={() => onBlendModeChange(mode.value)}
        >
          <span
            className={classNames(
              'mr-2 h-3 w-3 shrink-0 rounded-full border',
              blendMode === mode.value
                ? 'border-primary-active bg-primary-active'
                : 'border-aqua-pale'
            )}
          />
          <span className="text-common-bright mr-2 text-sm">{mode.label}</span>
          <span className="text-aqua-pale text-xs font-light">{mode.description}</span>
        </div>
      ))}
    </div>
  );
}

export default MipMenuItem;
