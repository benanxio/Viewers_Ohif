import React, { useCallback, useEffect, useState } from 'react';
import { useViewportGrid } from '@ohif/ui';
import { Enums } from '@cornerstonejs/core';

const MIN_THICKNESS = 0.1;
const MAX_THICKNESS = 50;
const STEP = 0.1;

const BLEND_MODE_OPTIONS = [
  { value: 'mip', label: 'MIP - Proyección de máxima intensidad' },
  { value: 'minip', label: 'MinIP - Proyección de mínima intensidad' },
  { value: 'avg', label: 'Mean - Proyección de intensidad media' },
];

function blendModeToString(blendMode) {
  switch (blendMode) {
    case Enums.BlendModes.MINIMUM_INTENSITY_BLEND:
      return 'minip';
    case Enums.BlendModes.AVERAGE_INTENSITY_BLEND:
      return 'avg';
    default:
      return 'mip';
  }
}

// avoids floating point drift (0.1 + 0.1 + 0.1 = 0.30000000000000004)
function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function PanelTestMip({ servicesManager, commandsManager }: withAppTypes) {
  const { cornerstoneViewportService } = servicesManager.services;
  const [viewportGrid] = useViewportGrid();
  const { activeViewportId } = viewportGrid;

  const [thickness, setThickness] = useState(MIN_THICKNESS);
  const [blendMode, setBlendMode] = useState('mip');
  const [isVolumeViewport, setIsVolumeViewport] = useState(false);

  useEffect(() => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
    const supported = typeof viewport?.setBlendMode === 'function';
    setIsVolumeViewport(supported);

    if (supported) {
      setThickness(round1(Math.max(viewport.getSlabThickness() ?? MIN_THICKNESS, MIN_THICKNESS)));
      setBlendMode(blendModeToString(viewport.getBlendMode()));
    }
  }, [activeViewportId, cornerstoneViewportService]);

  const apply = useCallback(
    (nextThickness: number, nextBlendMode: string) => {
      commandsManager.runCommand('setViewportBlendModeAndThickness', {
        viewportId: activeViewportId,
        blendMode: nextBlendMode,
        slabThickness: nextThickness,
      });
    },
    [activeViewportId, commandsManager]
  );

  const changeThickness = (delta: number) => {
    setThickness(prev => {
      const next = Math.min(MAX_THICKNESS, Math.max(MIN_THICKNESS, round1(prev + delta)));
      apply(next, blendMode);
      return next;
    });
  };

  const onSliderChange = (value: number) => {
    if (Number.isNaN(value)) {
      return;
    }
    const next = round1(value);
    setThickness(next);
    apply(next, blendMode);
  };

  const onBlendModeChange = (value: string) => {
    setBlendMode(value);
    apply(thickness, value);
  };

  if (!activeViewportId) {
    return <div className="p-4 text-white">Selecciona un viewport.</div>;
  }

  if (!isVolumeViewport) {
    return (
      <div className="p-4 text-white">
        <p>Esta herramienta solo aplica sobre viewports MPR (reconstrucción de volumen).</p>
        <p className="text-aqua-pale mt-2 text-sm">
          Activa el layout MPR y selecciona una vista axial, sagital o coronal.
        </p>
      </div>
    );
  }

  const percentage = ((thickness - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100;

  return (
    <div className="p-4 text-white">
      <div className="mb-4">
        <label className="mb-2 block">Grosor de corte (mm)</label>
        <input
          type="range"
          className="bg-inputfield-main h-2 w-full cursor-pointer appearance-none rounded-lg"
          min={MIN_THICKNESS}
          max={MAX_THICKNESS}
          step={STEP}
          value={thickness}
          onChange={e => onSliderChange(parseFloat(e.target.value))}
          style={
            {
              background: `linear-gradient(to right, #5acce6 0%, #5acce6 ${percentage}%, #3a3f99 ${percentage}%, #3a3f99 100%)`,
            } as React.CSSProperties
          }
        />
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Disminuir grosor"
            className="bg-primary-dark hover:bg-primary-main flex h-7 w-7 items-center justify-center rounded text-lg leading-none"
            onClick={() => changeThickness(-STEP)}
          >
            −
          </button>
          <span className="w-16 text-center tabular-nums">{thickness.toFixed(1)} mm</span>
          <button
            type="button"
            aria-label="Aumentar grosor"
            className="bg-primary-dark hover:bg-primary-main flex h-7 w-7 items-center justify-center rounded text-lg leading-none"
            onClick={() => changeThickness(STEP)}
          >
            +
          </button>
        </div>
      </div>

      <div className="mb-2">
        <label className="mb-2 block">Modo de proyección</label>
        <select
          className="border-primary-main bg-black w-full rounded border px-2 py-2 text-white"
          value={blendMode}
          onChange={e => onBlendModeChange(e.target.value)}
        >
          {BLEND_MODE_OPTIONS.map(option => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-aqua-pale mt-3 text-xs">
        Se aplica a las 3 vistas MPR (axial, sagital, coronal) a la vez.
      </p>
    </div>
  );
}

export default PanelTestMip;
