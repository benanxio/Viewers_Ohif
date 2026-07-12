import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Enums } from '@cornerstonejs/core';

function ViewportImageSliceLoadingIndicator({ viewportData, element, servicesManager }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState(null);

  const loadIndicatorRef = useRef(null);
  const imageIdToBeLoaded = useRef(null);

  const setLoadingState = evt => {
    clearTimeout(loadIndicatorRef.current);

    loadIndicatorRef.current = setTimeout(() => {
      setLoading(true);
    }, 50);
  };

  const setFinishLoadingState = evt => {
    clearTimeout(loadIndicatorRef.current);

    setLoading(false);
  };

  const setErrorState = evt => {
    clearTimeout(loadIndicatorRef.current);

    if (imageIdToBeLoaded.current === evt.detail.imageId) {
      setError(evt.detail.error);
      imageIdToBeLoaded.current = null;
    }
  };

  useEffect(() => {
    element.addEventListener(Enums.Events.STACK_VIEWPORT_SCROLL, setLoadingState);
    element.addEventListener(Enums.Events.IMAGE_LOAD_ERROR, setErrorState);
    element.addEventListener(Enums.Events.STACK_NEW_IMAGE, setFinishLoadingState);

    return () => {
      element.removeEventListener(Enums.Events.STACK_VIEWPORT_SCROLL, setLoadingState);

      element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, setFinishLoadingState);

      element.removeEventListener(Enums.Events.IMAGE_LOAD_ERROR, setErrorState);
    };
  }, [element, viewportData]);

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
      <>
        <div className="absolute top-0 left-0 h-full w-full bg-black opacity-50">
          <div className="transparent flex h-full w-full items-center justify-center">
            <p className="text-primary-light text-xl font-light">
              <h4>Error Loading Image</h4>
              <p>An error has occurred.</p>
              <p>{error}</p>
            </p>
          </div>
        </div>
      </>
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
    const percent = Math.round((prefetchProgress.loaded / prefetchProgress.total) * 100);

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
  error: PropTypes.object,
  element: PropTypes.object,
  servicesManager: PropTypes.object,
};

export default ViewportImageSliceLoadingIndicator;
