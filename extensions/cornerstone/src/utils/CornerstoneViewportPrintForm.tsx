import React, { useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  Enums,
  getEnabledElement,
  getOrCreateCanvas,
  StackViewport,
  BaseVolumeViewport,
} from '@cornerstonejs/core';
import { ToolGroupManager } from '@cornerstonejs/tools';
import PropTypes from 'prop-types';
import { ViewportPrintForm } from '@ohif/ui';
import { utils } from '@ohif/core';
import { sendPrint } from '../services/PrinterService/printerService';
import { getEnabledElement as OHIFgetEnabledElement } from '../state';

const { getUrlParams } = utils;

const MINIMUM_SIZE = 100;
const DEFAULT_SIZE = 512;
const MAX_TEXTURE_SIZE = 10000;
const VIEWPORT_ID_PREFIX = 'cornerstone-viewport-print-form-';
const DEFAULT_QUALITY = 1;

const CornerstoneViewportPrintForm = ({
  activeViewports,
  layout,
  onClose,
  cornerstoneViewportService,
  displaySetService,
  showPrintSuccess,
  showPrintError,
}) => {
  const activeViewportIds = [...activeViewports.keys()];
  const toolModeAndBindingsArray = activeViewportIds
    .map((activeViewportIdProp, i) => {
      const enabledElement = OHIFgetEnabledElement(activeViewportIdProp);
      const activeViewportElement = enabledElement?.element;

      if (!activeViewportElement) {
        console.warn(`No enabled element found for viewport ID ${activeViewportIdProp}`);
        return null;
      }

      const activeViewportEnabledElement = getEnabledElement(activeViewportElement);

      if (!activeViewportEnabledElement) {
        console.warn(`No enabled element found for viewport element ${activeViewportElement}`);
        return null;
      }

      const {
        viewportId: activeViewportId,
        renderingEngineId,
        viewport: activeViewport,
      } = activeViewportEnabledElement;

      if (!renderingEngineId) {
        console.error(`Rendering engine ID is undefined for viewport ID ${activeViewportId}`);
        return null;
      }

      const toolGroup = ToolGroupManager.getToolGroupForViewport(
        activeViewportId,
        renderingEngineId
      );

      if (!toolGroup) {
        console.error(
          `Tool group not found for viewport ID ${activeViewportId} and rendering engine ID ${renderingEngineId}`
        );
        return null;
      }

      const toolModeAndBindings = Object.keys(toolGroup.toolOptions).reduce((acc, toolName) => {
        const tool = toolGroup.toolOptions[toolName];
        const { mode, bindings } = tool;

        return {
          ...acc,
          [toolName]: {
            mode,
            bindings,
          },
        };
      }, {});

      return {
        toolModeAndBindings,
        activeViewport,
        activeViewportElement,
        activeViewportId: `${VIEWPORT_ID_PREFIX}${i}`,
        renderingEngineId,
        value: activeViewports.get(activeViewportIdProp),
      };
    })
    .filter(item => item !== null);
  useEffect(() => {
    return () => {
      toolModeAndBindingsArray.forEach(
        ({ toolModeAndBindings, activeViewportId, renderingEngineId }) => {
          const toolGroup = ToolGroupManager.getToolGroupForViewport(
            activeViewportId,
            renderingEngineId
          );

          if (toolGroup) {
            Object.keys(toolModeAndBindings).forEach(toolName => {
              const { mode, bindings } = toolModeAndBindings[toolName];
              toolGroup.setToolMode(toolName, mode, { bindings });
            });
          }
        }
      );
    };
  }, [toolModeAndBindingsArray]);

  const enableViewports = viewportElements => {
    viewportElements.forEach((viewportElement, i) => {
      if (viewportElement) {
        const existingEnabledElement = getEnabledElement(viewportElement);

        if (existingEnabledElement) {
          console.warn('Viewport element is already enabled:', viewportElement);
          return; // Skip if already enabled
        }

        const { renderingEngineId, activeViewport } = toolModeAndBindingsArray[i];

        const renderingEngine = cornerstoneViewportService.getRenderingEngine(renderingEngineId);
        if (!renderingEngine) {
          console.error('Rendering engine is undefined.');
          return;
        }

        const viewportInput = {
          viewportId: `${VIEWPORT_ID_PREFIX}${i}`,
          element: viewportElement,
          type: activeViewport.type,
          defaultOptions: {
            background: activeViewport.defaultOptions.background,
            orientation: activeViewport.defaultOptions.orientation,
          },
        };

        try {
          renderingEngine.enableElement(viewportInput);
        } catch (error) {
          console.error(`Error enabling viewport element: ${error.message}`);
        }
      }
    });
  };

  const disableViewport = viewportElement => {
    if (viewportElement) {
      const enabledElement = getEnabledElement(viewportElement);

      if (!enabledElement) {
        console.warn('Cannot disable viewport element because it is not enabled:', viewportElement);
        return;
      }

      const { renderingEngine } = enabledElement;

      if (!renderingEngine) {
        console.error('Rendering engine is undefined.');
        return;
      }

      return new Promise(resolve => {
        try {
          renderingEngine.disableElement(viewportElement.viewportId);
          resolve();
        } catch (error) {
          console.error(`Error disabling viewport element: ${error.message}`);
          resolve();
        }
      });
    }
  };

  const updateViewportPreview = (printViewportElement, internalCanvas, fileType) =>
    new Promise(resolve => {
      const enabledElement = getEnabledElement(printViewportElement);

      if (!enabledElement) {
        console.error('Enabled element not found for print viewport element.');
        return;
      }

      const { viewport: printViewport, renderingEngine } = enabledElement;

      if (!renderingEngine) {
        console.error('Rendering engine is undefined.');
        return;
      }

      renderingEngine.resize();
      printViewport.render();

      const updateViewport = event => {
        const enabledElement = getEnabledElement(event.target);
        if (!enabledElement) {
          return;
        }

        const { viewport } = enabledElement;
        const { element } = viewport;

        const downloadCanvas = getOrCreateCanvas(element);
        const type = 'image/' + fileType;
        const dataUrl = downloadCanvas.toDataURL(type, 1);

        if (!dataUrl) {
          console.error('Failed to generate data URL from canvas.');
          return;
        }

        let newWidth = element.offsetHeight;
        let newHeight = element.offsetWidth;

        if (newWidth > DEFAULT_SIZE || newHeight > DEFAULT_SIZE) {
          const multiplier = DEFAULT_SIZE / Math.max(newWidth, newHeight);
          newHeight *= multiplier;
          newWidth *= multiplier;
        }

        resolve({ dataUrl, width: newWidth, height: newHeight });

        printViewportElement.removeEventListener(Enums.Events.IMAGE_RENDERED, updateViewport);
        printViewport.resetCamera();

        const presentation = viewport.getViewPresentation();
        if (printViewport.setView) {
          printViewport.setView(viewport.getViewReference(), presentation);
        }
        printViewport.render();
      };

      // Escuchar el evento IMAGE_RENDERED solo una vez
      printViewportElement.addEventListener(Enums.Events.IMAGE_RENDERED, updateViewport, {
        once: true,
      });
    });

  const loadImage = (activeViewportElement, activeViewportIdx, viewportElement, width, height) =>
    new Promise(resolve => {
      if (activeViewportElement && viewportElement) {
        const activeViewportEnabledElement = getEnabledElement(activeViewportElement);

        if (!activeViewportEnabledElement) {
          console.error('No enabled element found for active viewport element.');
          return;
        }

        const { viewport } = activeViewportEnabledElement;
        const renderingEngine = cornerstoneViewportService.getRenderingEngine();
        const printViewport = renderingEngine.getViewport(
          `${VIEWPORT_ID_PREFIX}${activeViewportIdx}`
        );

        if (printViewport instanceof StackViewport) {
          const imageId = viewport.getCurrentImageId();
          const properties = viewport.getProperties();

          printViewport.setStack([imageId]).then(() => {
            try {
              printViewport.setProperties(properties);
              const newWidth = Math.min(width || image.width, MAX_TEXTURE_SIZE);
              const newHeight = Math.min(height || image.height, MAX_TEXTURE_SIZE);

              resolve({ width: newWidth, height: newHeight });
            } catch (e) {
              console.warn('Unable to set properties', e);
            }
          });
        } else if (printViewport instanceof BaseVolumeViewport) {
          const actors = viewport.getActors();
          actors.forEach(actor => {
            printViewport.addActor(actor);
          });

          printViewport.render();

          const newWidth = Math.min(width || image.width, MAX_TEXTURE_SIZE);
          const newHeight = Math.min(height || image.height, MAX_TEXTURE_SIZE);

          resolve({ width: newWidth, height: newHeight });
        }
      }
    });

  const toggleAnnotations = (toggle, viewportElement, activeViewportElement) => {
    const activeViewportEnabledElement = getEnabledElement(activeViewportElement);
    const downloadViewportElement = getEnabledElement(viewportElement);

    if (!downloadViewportElement || !activeViewportElement) {
      return;
    }

    const { viewportId: activeViewportId, renderingEngineId } = activeViewportEnabledElement;
    const { viewportId: downloadViewportId } = downloadViewportElement;

    if (!activeViewportEnabledElement || !downloadViewportElement) {
      return;
    }

    const toolGroup = ToolGroupManager.getToolGroupForViewport(activeViewportId, renderingEngineId);

    // add the viewport to the toolGroup
    toolGroup.addViewport(downloadViewportId, renderingEngineId);

    Object.keys(toolGroup.getToolInstances()).forEach(toolName => {
      // make all tools Enabled so that they can not be interacted with
      // in the download viewport
      if (toggle && toolName !== 'Crosshairs') {
        try {
          toolGroup.setToolEnabled(toolName);
        } catch (e) {
          console.log(e);
        }
      } else {
        toolGroup.setToolDisabled(toolName);
      }
    });
  };

  const downloadBlob = async (filename, fileType, quality, id_printer, page_size) => {
    const scale = Math.max(quality || DEFAULT_QUALITY, DEFAULT_QUALITY);
    const file = `${filename}.${fileType}`;
    const divForPrintViewport = document.getElementById('cornerstone-print-container');
    const { id: studyUid } = getUrlParams();

    try {
      const canvas = await html2canvas(divForPrintViewport, { scale: scale });

      // Convertir el canvas a un Blob (Archivo)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, `image/${fileType}`, 1.0));

      // Crear FormData y cargar la información requerida
      const form = new FormData();
      form.append('image', blob, file); // 'image' es el nombre del campo que se espera en el backend
      form.append('id_printer', id_printer); // Reemplaza con el ID de la impresora real
      form.append('uid', studyUid); // Reemplaza con el UID del estudio real
      form.append('page_size', page_size);

      // Enviar el FormData usando sendPrint
      const response = await sendPrint(form);
      showPrintSuccess(response.message);
      onClose();
    } catch (error) {
      showPrintError(error.message);
    }
  };

  return (
    <ViewportPrintForm
      onClose={onClose}
      minimumSize={MINIMUM_SIZE}
      maximumSize={MAX_TEXTURE_SIZE}
      activeViewportElements={toolModeAndBindingsArray.map(item => item.activeViewportElement)}
      activeViewportsData={toolModeAndBindingsArray.map(item => item.value)}
      enableViewports={enableViewports}
      disableViewport={disableViewport}
      updateViewportPreview={updateViewportPreview}
      loadImage={loadImage}
      toggleAnnotations={toggleAnnotations}
      downloadBlob={downloadBlob}
      displaySetService={displaySetService}
      layout={layout}
    />
  );
};

CornerstoneViewportPrintForm.propTypes = {
  onClose: PropTypes.func,
  layout: PropTypes.object.isRequired,
  activeViewports: PropTypes.any.isRequired,
  cornerstoneViewportService: PropTypes.object.isRequired,
  displaySetService: PropTypes.object.isRequired,
  showPrintSuccess: PropTypes.func.isRequired,
  showPrintError: PropTypes.func.isRequired,
};

export default CornerstoneViewportPrintForm;
