import React, { useEffect, useState } from 'react';
import { utils } from '@ohif/core';
import { Dialog } from '@ohif/ui';
import { PdfReportContent } from '@ohif/ui-next';
import { useCustomContext } from '@state';

const { getUrlParams, encodeFlags } = utils;

interface HistorialItem {
  study_iuid: string;
  client: string;
  sede: string;
  dt: string;
  study_date: string | null;
  modality: string | null;
  study_desc: string | null;
  alph_name: string | null;
  has_report: boolean;
}

// Custom Xpectria panel: historial de estudios previos del mismo paciente
// (vinculados por DNI en el backend, no por PatientID). Permite abrir un
// estudio previo en una pestaña nueva de solo lectura, y ver su informe
// firmado en un modal, para comparar hallazgos/lesiones con el estudio actual.
function PanelHistory({ servicesManager }: withAppTypes) {
  const { xpectriaService, uiDialogService } = servicesManager.services;
  const { isMobile } = useCustomContext();
  const { permissions } = getUrlParams();
  // Same criterion as the tab-visibility filter in SidePanelWithServices:
  // view_report alone (e.g. a "Compartir estudio" link) must not expose the
  // patient's full study/report history across sedes.
  const canView = Boolean(permissions.view_measurements);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState<HistorialItem[]>([]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    xpectriaService.XpectriaApi.getHistorial()
      .then(({ enabled: isEnabled, items: data }) => {
        if (!cancelled) {
          setEnabled(isEnabled);
          setItems(data || []);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Error al obtener el historial');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const handleOpenStudy = (item: HistorialItem) => {
    const permissionFlags = encodeFlags([true, false, false, true, false]);
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('cl', item.client);
    url.searchParams.set('sd', item.sede);
    url.searchParams.set('dt', item.dt);
    url.searchParams.set('id', `${permissionFlags}v2.${item.study_iuid}`);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleViewReport = (item: HistorialItem) => {
    const pdfPromise = xpectriaService.XpectriaApi.getPdfBlobFor({
      sede: item.sede,
      date: item.dt,
      client: item.client,
      uid: item.study_iuid,
    });

    const dialogId = 'history-report-modal';
    const noop = () => {};
    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      defaultPosition: { x: 0, y: 0 },
      onDrag: noop,
      onStart: noop,
      onStop: noop,
      contentProps: {
        title: item.study_desc || 'Informe previo',
        body: () => {
          const onClose = () => uiDialogService.dismiss({ id: dialogId });
          return (
            <React.Suspense fallback={<div>Cargando...</div>}>
              <PdfReportContent
                pdfPromise={pdfPromise}
                onCloseModal={onClose}
                isMobile={isMobile}
              />
            </React.Suspense>
          );
        },
        actions: [],
        onClose: () => uiDialogService.dismiss({ id: dialogId }),
      },
    });
  };

  if (!canView) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-center text-white">
        No tiene los permisos suficientes para ver el historial de este paciente.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto p-3 text-white">
      {loading && (
        <div className="p-4 text-center text-sm text-gray-400">Buscando estudios previos...</div>
      )}
      {!loading && error && <div className="p-4 text-center text-sm text-red-400">{error}</div>}
      {!loading && !error && !enabled && (
        <div className="p-4 text-center text-sm text-gray-400">
          El historial de estudios previos no está habilitado para esta sede.
        </div>
      )}
      {!loading && !error && enabled && items.length === 0 && (
        <div className="p-4 text-center text-sm text-gray-400">
          No hay estudios previos para este paciente.
        </div>
      )}
      {!loading && !error && enabled && items.length > 0 && (
        <ul className="space-y-2">
          {items.map(item => (
            <li
              key={item.study_iuid}
              className="bg-secondary-dark rounded-md p-3"
            >
              <p className="text-sm font-semibold text-white">
                {item.study_date || 'Fecha desconocida'}
              </p>
              <p className="truncate text-xs text-gray-300">
                {item.modality} · {item.study_desc || 'Sin descripción'}
              </p>
              <p className="truncate text-xs text-gray-400">
                {item.sede} - {item.client}
              </p>
              <div className="mt-2 flex gap-x-2">
                <button
                  className="bg-primary-main hover:bg-primary-light rounded px-2 py-1 text-xs text-white"
                  onClick={() => handleOpenStudy(item)}
                >
                  Ver estudio
                </button>
                {item.has_report && (
                  <button
                    className="bg-secondary-main hover:bg-secondary-light rounded px-2 py-1 text-xs text-white"
                    onClick={() => handleViewReport(item)}
                  >
                    Ver informe
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PanelHistory;
