import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Enums, eventTarget, getEnabledElement, metaData, cache } from '@cornerstonejs/core';
import { IMAGE_DOWNLOAD_PROGRESS } from '../../initWADOImageLoader';

// La URL que descarga el loader es el imageId sin el esquema (dicomweb:, wadouri:)
const urlFromImageId = imageId => (imageId || '').replace(/^\w+:(?=https?:)/, '');

const formatMB = bytes => (bytes / (1024 * 1024)).toFixed(1);

// Misma detección que mgAutoAllowed / customContext. En PC (lectura diagnóstica)
// no se muestra la vista previa de baja calidad dentro del viewport, solo el progreso.
const isMobileDevice = () => {
  const ua = (navigator.userAgent || '').toLowerCase();
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth <= 768;
};

function ViewportImageSliceLoadingIndicator({ viewportData, element, servicesManager }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefetchProgress, setPrefetchProgress] = useState(null);
  // Primera carga del viewport: { imageId, thumbnailURL } hasta que se dibuja la imagen
  const [initialLoad, setInitialLoad] = useState(null);
  const [download, setDownload] = useState(null);

  const loadIndicatorRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const initialImageIdRef = useRef(null);

  const setLoadingState = evt => {
    clearTimeout(loadIndicatorRef.current);

    loadIndicatorRef.current = setTimeout(() => {
      setLoading(true);
    }, 50);
  };

  const setFinishLoadingState = evt => {
    clearTimeout(loadIndicatorRef.current);

    setLoading(false);
    setInitialLoad(null);
    setError(null);
  };

  // El viewport ya está mostrando su imagen actual
  const hasCurrentImage = () => {
    const viewport = getEnabledElement(element)?.viewport;
    const currentImageId = viewport?.getCurrentImageId?.();
    // Los viewports de volumen (MPR) no tienen getCornerstoneImage: el corte cuenta
    // como cargado si su imagen ya está en la caché
    if (viewport && viewport.type !== Enums.ViewportType.STACK) {
      return Boolean(currentImageId && cache.getImage(currentImageId));
    }
    const image = viewport?.getCornerstoneImage?.();
    return Boolean(image && image.imageId === currentImageId);
  };

  // IMAGE_LOAD_ERROR lo emite cornerstone en el eventTarget global, no en el elemento.
  // También llega por peticiones canceladas/duplicadas de una imagen que igual termina
  // cargando (p. ej. el auto-fit de mamografía recarga la pila), así que solo se muestra
  // el error si pasado un momento el viewport sigue sin imagen.
  const setErrorState = evt => {
    const imageId = evt.detail?.imageId;
    const viewport = getEnabledElement(element)?.viewport;
    if (!imageId || viewport?.getCurrentImageId?.() !== imageId) {
      return;
    }
    console.warn('Error cargando imagen del viewport', imageId, evt.detail?.error);

    clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (!hasCurrentImage()) {
        clearTimeout(loadIndicatorRef.current);
        setLoading(false);
        setError({ imageId });
      }
    }, 1500);
  };

  useEffect(() => {
    element.addEventListener(Enums.Events.STACK_VIEWPORT_SCROLL, setLoadingState);
    element.addEventListener(Enums.Events.STACK_NEW_IMAGE, setFinishLoadingState);
    eventTarget.addEventListener(Enums.Events.IMAGE_LOAD_ERROR, setErrorState);

    return () => {
      clearTimeout(errorTimeoutRef.current);
      element.removeEventListener(Enums.Events.STACK_VIEWPORT_SCROLL, setLoadingState);
      element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, setFinishLoadingState);
      eventTarget.removeEventListener(Enums.Events.IMAGE_LOAD_ERROR, setErrorState);
    };
  }, [element, viewportData]);

  // Si la imagen termina apareciendo (otro intento la cargó), se quita el error
  useEffect(() => {
    if (!error) {
      return;
    }
    const interval = setInterval(() => {
      if (hasCurrentImage()) {
        setError(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [error, element]);

  // Mientras el viewport de stack no tenga imagen dibujada se muestra la vista previa
  // (miniatura del JSON) con el progreso de descarga, en vez de dejarlo en negro
  useEffect(() => {
    const check = () => {
      const viewport = getEnabledElement(element)?.viewport;
      if (!viewport) {
        return false;
      }
      if (viewport.type !== Enums.ViewportType.STACK) {
        return true;
      }
      if (viewport.getCornerstoneImage?.()) {
        initialImageIdRef.current = null;
        setInitialLoad(null);
        return true;
      }
      const imageId = viewport.getCurrentImageId?.();
      if (imageId && imageId !== initialImageIdRef.current) {
        initialImageIdRef.current = imageId;
        setDownload(null);
        // En pilas (tomosíntesis, CT...) solo el corte del medio trae miniatura:
        // si el corte inicial no la tiene, se usa la de su misma pila
        const thumbnailURL =
          metaData.get('instance', imageId)?.ThumbnailURL ||
          (viewport.getImageIds?.() ?? [])
            .map(id => metaData.get('instance', id)?.ThumbnailURL)
            .find(Boolean);
        setInitialLoad({ imageId, thumbnailURL });
      }
      return false;
    };

    if (check()) {
      return;
    }
    const interval = setInterval(() => check() && clearInterval(interval), 200);
    return () => clearInterval(interval);
  }, [element, viewportData]);

  useEffect(() => {
    if (!initialLoad) {
      return;
    }
    const url = urlFromImageId(initialLoad.imageId);
    const onProgress = evt => {
      const { url: requestUrl, loaded, total } = evt.detail;
      if (requestUrl && (url.startsWith(requestUrl) || requestUrl.startsWith(url))) {
        setDownload({ loaded, total });
      }
    };
    eventTarget.addEventListener(IMAGE_DOWNLOAD_PROGRESS, onProgress);
    return () => eventTarget.removeEventListener(IMAGE_DOWNLOAD_PROGRESS, onProgress);
  }, [initialLoad]);

  const retry = () => {
    const viewport = getEnabledElement(element)?.viewport;
    if (!viewport || !error) {
      return;
    }
    setError(null);
    initialImageIdRef.current = null;
    try {
      cache.removeImageLoadObject(error.imageId, { force: true });
    } catch (e) {
      // no estaba en caché
    }
    try {
      if (viewport.type === Enums.ViewportType.STACK) {
        viewport.setStack(viewport.getImageIds(), viewport.getCurrentImageIdIndex());
      } else {
        // MPR: no hay setStack. Se vuelve a pedir lo que falta del volumen
        // (load() solo descarga los cortes que no están en caché) y se redibuja
        cache.getVolume(viewport.getVolumeId())?.load?.();
        viewport.render();
      }
    } catch (e) {
      // nunca recargar la página: se perdería el estudio y el layout MPR
      console.warn('No se pudo reintentar la carga de la imagen', e);
    }
  };

  // Aggregates StudyPrefetcherService progress (loaded/total instances) for
  // the display set(s) shown in this viewport, so a large series (eg. a
  // 500-image CT) shows a real "loaded X of Y images" progress bar instead
  // of just an indeterminate spinner.
  useEffect(() => {
    const studyPrefetcherService = servicesManager?.services?.studyPrefetcherService;
    const displaySetInstanceUIDs =
      viewportData?.data?.map(datum => datum.displaySetInstanceUID) ?? [];

    if (!studyPrefetcherService || !displaySetInstanceUIDs.length) {
      setPrefetchProgress(null);
      return;
    }

    const computeProgress = () => {
      let total = 0;
      let loaded = 0;

      displaySetInstanceUIDs.forEach(uid => {
        const state = studyPrefetcherService.getDisplaySetLoadingState(uid);

        if (!state) {
          return;
        }

        total += state.numInstances;
        loaded += state.loadedImageIds.size + state.failedImageIds.size;
      });

      setPrefetchProgress(total ? { loaded, total } : null);
    };

    computeProgress();

    const { unsubscribe } = studyPrefetcherService.subscribe(
      studyPrefetcherService.EVENTS.DISPLAYSET_LOAD_PROGRESS,
      evt => {
        if (displaySetInstanceUIDs.includes(evt.displaySetInstanceUID)) {
          computeProgress();
        }
      }
    );

    return () => unsubscribe();
  }, [servicesManager, viewportData]);

  if (error) {
    return (
      <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center bg-black/80">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-primary-light text-lg">No se pudo cargar la imagen</p>
          <p className="text-sm text-white/70">Revisa tu conexión e inténtalo de nuevo.</p>
          <button
            type="button"
            className="bg-primary-main hover:bg-primary-light rounded px-4 py-1.5 text-sm text-white"
            onClick={retry}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (initialLoad) {
    const percent = download?.total ? Math.round((download.loaded / download.total) * 100) : null;

    return (
      // pointer-events-none: el overlay no debe capturar el mouse del viewport
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden bg-black">
        {initialLoad.thumbnailURL && isMobileDevice() && (
          <img
            src={initialLoad.thumbnailURL}
            crossOrigin="anonymous"
            alt=""
            className="h-full w-full object-contain"
            style={{ filter: 'blur(6px) brightness(0.7)', transform: 'scale(1.03)' }}
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="border-primary-light h-9 w-9 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-primary-light text-base">Cargando imagen…</p>
          <div className="w-2/3 max-w-[220px]">
            <div className="bg-primary-dark h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={`bg-primary-light h-full rounded-full transition-all ${percent === null ? 'w-1/3 animate-pulse' : ''}`}
                style={percent === null ? undefined : { width: `${percent}%` }}
              />
            </div>
            {download && (
              <p className="mt-1 text-center text-xs text-white/80">
                {download.total
                  ? `${formatMB(download.loaded)} de ${formatMB(download.total)} MB (${percent}%)`
                  : `${formatMB(download.loaded)} MB`}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      // IMPORTANT: we need to use the pointer-events-none class to prevent the loading indicator from
      // interacting with the mouse, since scrolling should propagate to the viewport underneath
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-black opacity-50">
        <div className="transparent flex h-full w-full items-center justify-center">
          <p className="text-primary-light text-xl font-light">Cargando...</p>
        </div>
      </div>
    );
  }

  if (prefetchProgress && prefetchProgress.loaded < prefetchProgress.total) {
    const percent = Math.floor((prefetchProgress.loaded / prefetchProgress.total) * 100);

    return (
      <div className="pointer-events-none absolute bottom-2 left-1/2 w-2/3 max-w-xs -translate-x-1/2">
        <p className="text-primary-light mb-1 text-center text-xs">
          Cargando imágenes {prefetchProgress.loaded}/{prefetchProgress.total} ({percent}%)
        </p>
        <div className="bg-primary-dark h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary-light h-full rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}

ViewportImageSliceLoadingIndicator.propTypes = {
  element: PropTypes.object,
  servicesManager: PropTypes.object,
};

export default ViewportImageSliceLoadingIndicator;
