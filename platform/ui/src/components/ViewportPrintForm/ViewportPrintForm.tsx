import React, { useCallback, useEffect, useState, createRef, useRef, useMemo } from 'react';
import Typography from '../Typography';
import Select from '../Select';
import InputLabelWrapper from '../InputLabelWrapper';
import Button, { ButtonEnums } from '../Button';
import { usePatientInfo } from '../HeaderPatientInfo';
import getUrlParams from '../../utils/getUrlParams';
import { getPrinters } from '../../services/printerService';
import classNames from 'classnames';
import CheckBox from '../CheckBox';
import PropTypes from 'prop-types';
// import { Checkbox } from '../../../../ui-next/src/components/Checkbox/Checkbox';

const textSizes = {
  '1': 'text-lg',
  '2': 'text-base',
  '3': 'text-sm',
  '4': 'text-sm',
  '5': 'text-xs',
  '6': 'text-[12px]',
  '7': 'text-[10px]',
  default: 'text-[8px]',
};

function mmToPixels(mm, dpi = 96) {
  return Math.round((mm / 25.4) * dpi);
}

const FILE_QUALITY_OPTIONS = [
  { value: '1', label: 'Baja' },
  { value: '2', label: 'Media' },
  { value: '3', label: 'Alta' },
];

const FILE_SIZE_OPTIONS = [
  // Opciones Verticales (Portrait)
  { value: '210x297', label: 'A4 (210 mm x 297 mm) Vertical', increment: 1 },
  { value: '297x210', label: 'A4 (297 mm x 210 mm) Horizontal', increment: 2 },
  { value: '297x420', label: 'A3 (297 mm x 420 mm) Vertical', increment: 0 },
  { value: '420x297', label: 'A3 (420 mm x 297 mm) Horizontal', increment: 0 },
  { value: '216x279', label: 'Carta (216 mm x 279 mm) Vertical', increment: -1 },
  { value: '279x216', label: 'Carta (279 mm x 216 mm) Horizontal', increment: 0 },
  { value: '216x356', label: 'Oficio (216 mm x 356 mm) Vertical', increment: -2 },
  { value: '356x216', label: 'Oficio (356 mm x 216 mm) Horizontal', increment: 0 },
];

const DETAILS_POSITIONS = [
  { value: 'hidden', label: 'No mostrar' },
  { value: 'left-2 text-left', label: 'Izquierda' },
  { value: 'right-2 text-right', label: 'Derecha' },
];

const DEFAULT_FILENAME = 'Printer_study';

const REFRESH_VIEWPORT_TIMEOUT = 100;

const ViewportPrintForm = ({
  activeViewportElements,
  activeViewportsData,
  onClose,
  updateViewportPreview,
  enableViewports,
  disableViewport,
  toggleAnnotations,
  loadImage,
  downloadBlob,
  minimumSize,
  maximumSize,
  canvasClass,
  displaySetService,
  layout,
}) => {
  const DEFAULT_DIMENSIONS = {
    width: mmToPixels(Number(210)),
    height: mmToPixels(Number(297)),
  };

  const { patientInfo } = usePatientInfo({ services: { displaySetService } });
  const params = getUrlParams();
  const [fileType, _] = useState('png');
  const [printer, setPrinter] = useState([]);
  const [printers, setPrinters] = useState<
    {
      value: string;
      label: string;
    }[]
  >([]);
  const [quality, setQuality] = useState([FILE_QUALITY_OPTIONS[0].value]);
  const [fileMargins, setFileMargins] = useState([FILE_SIZE_OPTIONS[0].value]);
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [viewportElements, setViewportElements] = useState([]);
  const [viewportElementDimensions, setViewportElementDimensions] = useState(DEFAULT_DIMENSIONS);
  const [position, setPosition] = useState([DETAILS_POSITIONS[1].value]);
  const [printing, setPrinting] = useState(false);

  const [downloadCanvas, setDownloadCanvas] = useState({
    ref: createRef(),
    width: DEFAULT_DIMENSIONS.width,
    height: DEFAULT_DIMENSIONS.height,
  });

  const [error, setError] = useState({
    width: false,
    height: false,
    filename: false,
    printer: false,
    errorPrint: false,
  });

  const hasError = Object.values(error).includes(true);

  const refreshViewport = useRef(null);
  const viewportRefs = useRef([]);

  const downloadImage = async () => {
    const [qualityVal] = quality;
    const [id_printer] = printer;
    const [size_value] = fileMargins;

    const option = FILE_SIZE_OPTIONS.find(FSO => FSO.value === size_value);

    if (!option || !id_printer) {
      setError(error => ({ ...error, errorPrint: true }));
    } else {
      const orientation = option.label.toLowerCase().includes('vertical')
        ? 'portrait'
        : 'landscape';
      const page_size = `${size_value.toUpperCase()}, ${orientation}`;
      setPrinting(true);
      await downloadBlob(
        DEFAULT_FILENAME,
        fileType,
        Number(qualityVal) || 1,
        id_printer,
        page_size
      );
      setPrinting(false);
    }
  };

  const error_messages = {
    width: 'El ancho mínimo válido es 100px.',
    height: 'La altura mínima válida es 100px.',
    filename: 'El nombre de archivo no puede estar vacio.',
    printer: 'Error al cargar las impresoras',
    errorPrint: 'Selecciona una impresora',
  };

  const renderErrorHandler = errorType => {
    if (!error[errorType]) {
      return null;
    }
    return (
      <Typography
        className="mt-2 pl-1"
        color="error"
      >
        {error_messages[errorType]}
      </Typography>
    );
  };

  const validSize = useCallback(
    value => (value >= minimumSize ? value : minimumSize),
    [minimumSize]
  );

  const loadAndUpdateViewports = useCallback(async () => {
    if (activeViewportElements.length === 0 || viewportElements.length === 0) {
      return;
    }

    activeViewportElements.map(async (activeViewportElement, index) => {
      const { width: scaledWidth, height: scaledHeight } = await loadImage(
        activeViewportElement,
        index,
        viewportElements[index],
        dimensions.width,
        dimensions.height
      );

      toggleAnnotations(showAnnotations, viewportElements[index], activeViewportElement);

      const scaledDimensions = {
        height: validSize(scaledHeight),
        width: validSize(scaledWidth),
      };

      setDownloadCanvas(state => ({
        ...state,
        ...scaledDimensions,
      }));

      setViewportElementDimensions(scaledDimensions);

      await updateViewportPreview(viewportElements[index], downloadCanvas.ref.current, fileType);
    });
  }, [
    loadImage,
    activeViewportElements,
    viewportElements,
    dimensions,
    toggleAnnotations,
    showAnnotations,
    validSize,
    updateViewportPreview,
    downloadCanvas.ref,
    fileType,
  ]);

  useEffect(() => {
    const listPrinters = async () => {
      try {
        const { sede } = getUrlParams();
        const data = await getPrinters(sede);
        setPrinters(data.map(dt => ({ value: dt.id.toString(), label: dt.nombre_modelo })));
        setError(error => ({ ...error, printer: false }));
      } catch (error) {
        setError(error => ({ ...error, printer: true }));
      }
    };

    listPrinters();

    setViewportElements(viewportRefs.current);
  }, []);

  useEffect(() => {
    if (viewportElements.length > 0) {
      enableViewports(viewportElements);
    }

    return () => {
      viewportElements.forEach(viewportElement => {
        disableViewport(viewportElement);
      });
    };
  }, [disableViewport, enableViewports, viewportElements]);

  useEffect(() => {
    if (refreshViewport.current !== null) {
      clearTimeout(refreshViewport.current);
    }

    refreshViewport.current = setTimeout(() => {
      refreshViewport.current = null;
      loadAndUpdateViewports();
    }, REFRESH_VIEWPORT_TIMEOUT);
  }, [
    activeViewportElements,
    viewportElements,
    showAnnotations,
    dimensions,
    loadImage,
    toggleAnnotations,
    updateViewportPreview,
    fileType,
    downloadCanvas.ref,
    minimumSize,
    maximumSize,
    loadAndUpdateViewports,
  ]);

  useEffect(() => {
    const { width, height } = dimensions;
    const hasError = {
      width: width < minimumSize,
      height: height < minimumSize,
      filename: !DEFAULT_FILENAME,
    };

    setError(error => ({ ...error, ...hasError }));
  }, [dimensions, minimumSize]);

  const handleFileMarginChange = val => {
    setFileMargins([val]);
    const [w, h] = val.split('x');
    const newDimension = {
      width: mmToPixels(Number(w)),
      height: mmToPixels(Number(h)),
    };
    setDimensions(newDimension);
    setViewportElementDimensions(newDimension);
    setDownloadCanvas(state => ({
      ...state,
      ...newDimension,
    }));
  };

  const { increment } = FILE_SIZE_OPTIONS.find(fm => fm.value === fileMargins[0]) || {
    increment: 0,
  };
  const textSizeClass =
    textSizes[
      activeViewportElements.length > 2
        ? activeViewportElements.length + increment
        : activeViewportElements.length
    ] || textSizes['default'];

  const [detailsPos] = position;

  const DetailsComponent = () => (
    <div
      className={classNames(
        'overlay-text pointer-events-none absolute top-1 z-[1] flex w-2/4 flex-col gap-0 leading-tight text-gray-200',
        detailsPos,
        textSizeClass
      )}
    >
      <p>Paciente: {patientInfo.PatientName}</p>
      <p>Edad: {patientInfo.PatientDOB}</p>
      <p>Sexo: {patientInfo.PatientSex}</p>
      <p>Estudio: {patientInfo.StudyDescription}</p>
      <p>Captura: {patientInfo.StudyCapture}</p>
      <p>Organización: {params.client.replace(/-/g, ' ')}</p>
      <p>Sucursal: {params.sede.replace(/-/g, ' ')}</p>
    </div>
  );

  return (
    <div>
      <Typography variant="h6">{'Selecciones las opciones que crea convenientes'}</Typography>
      <div className="mt-6 flex flex-col">
        <div className="flex flex-col sm:flex-row">
          <div className="flex sm:w-2/4">
            <div className="flex grow flex-col">
              <div>
                <InputLabelWrapper
                  sortDirection="none"
                  label={'Tamaño de papel'}
                  isSortable={false}
                  onLabelClick={() => {}}
                >
                  <Select
                    id="file-size"
                    className="z-20 mt-2 text-white"
                    isClearable={false}
                    value={fileMargins}
                    data-cy="file-size"
                    onChange={value => {
                      handleFileMarginChange(value.value);
                    }}
                    hideSelectedOptions={false}
                    options={FILE_SIZE_OPTIONS}
                    placeholder="Tipo de archivo"
                  />
                </InputLabelWrapper>
                {renderErrorHandler('width')}
                {renderErrorHandler('height')}
              </div>
              <div className="mt-2">
                <InputLabelWrapper
                  sortDirection="none"
                  label={'Seleccione una impresora'}
                  isSortable={false}
                  onLabelClick={() => {}}
                >
                  <Select
                    id="printer-option"
                    className="z-10 mt-2 text-white"
                    isClearable={false}
                    value={printer}
                    data-cy="printer-option"
                    onChange={value => {
                      setError(error => ({ ...error, errorPrint: false }));
                      setPrinter([value.value]);
                    }}
                    hideSelectedOptions={false}
                    options={printers}
                    placeholder="Seleccione una impresora"
                  />
                </InputLabelWrapper>
                {renderErrorHandler('printer')}
                {renderErrorHandler('errorPrint')}
              </div>
            </div>
          </div>
          <div className="sm:border-secondary-dark sm:ml-6 sm:w-2/4 sm:border-l sm:pl-6">
            <div>
              <InputLabelWrapper
                sortDirection="none"
                label={'Calidad'}
                isSortable={false}
                onLabelClick={() => {}}
              >
                <Select
                  id="file-quality"
                  className="mt-2 text-white"
                  isClearable={false}
                  value={quality}
                  data-cy="file-quality"
                  onChange={value => {
                    setQuality([value.value]);
                  }}
                  hideSelectedOptions={false}
                  options={FILE_QUALITY_OPTIONS}
                  placeholder="Calidad"
                />
              </InputLabelWrapper>
            </div>
            <div className="mt-2">
              <InputLabelWrapper
                sortDirection="none"
                label={'Posición de detalles'}
                isSortable={false}
                onLabelClick={() => {}}
              >
                <Select
                  id="details-pos"
                  className="mt-2 text-white"
                  isClearable={false}
                  value={position}
                  data-cy="details-pos"
                  onChange={value => {
                    setPosition([value.value]);
                  }}
                  hideSelectedOptions={false}
                  options={DETAILS_POSITIONS}
                  placeholder="Posición de detalles"
                />
              </InputLabelWrapper>
            </div>
            <div className="mt-4 ml-2">
              <CheckBox
                label="Mostrar anotaciones"
                checked={showAnnotations}
                onChange={state => setShowAnnotations(state)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Typography variant="h6">{'Vista previa de la imagen'}</Typography>
        <div
          className="bg-secondary-dark border-secondary-dark w-max-content min-w-full rounded border p-4"
          data-cy="image-preview"
        >
          {activeViewportElements.length > 0 && (
            <div
              style={{
                position: 'relative',
                height: viewportElementDimensions.height,
                width: viewportElementDimensions.width,
              }}
              className="mx-auto bg-black"
              id="cornerstone-print-container"
            >
              {activeViewportElements.map((_, index) => {
                const {
                  x: viewportX,
                  y: viewportY,
                  width: viewportWidth,
                  height: viewportHeight,
                } = activeViewportsData[index];
                return (
                  <div
                    key={index}
                    className="relative"
                    style={{
                      position: 'absolute',
                      top: viewportY * 100 + 0.2 + '%',
                      left: viewportX * 100 + 0.2 + '%',
                      width: viewportWidth * 100 - 0.3 + '%',
                      height: viewportHeight * 100 - 0.3 + '%',
                    }}
                    ref={ref => {
                      viewportRefs.current[index] = ref;
                    }}
                  >
                    <DetailsComponent />
                  </div>
                );
              })}
            </div>
          )}
          {activeViewportElements.length === 0 && (
            <Typography className="mt-4">
              {'La ventana gráfica activa no tiene ninguna imagen mostrada'}
            </Typography>
          )}
        </div>
      </div>
      {hasError && (
        <div className="mt-4 flex justify-end">
          {renderErrorHandler('width')}
          {renderErrorHandler('height')}
          {renderErrorHandler('printer')}
          {renderErrorHandler('errorPrint')}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button
          name="cancel"
          type={ButtonEnums.type.secondary}
          onClick={onClose}
        >
          {'Cancelar'}
        </Button>
        <Button
          className="ml-2"
          disabled={hasError || printing}
          onClick={downloadImage}
          type={ButtonEnums.type.primary}
          name={'print'}
        >
          {printing ? 'Cargando...' : 'Imprimir'}
        </Button>
      </div>
    </div>
  );
};

ViewportPrintForm.propTypes = {
  activeViewportElements: PropTypes.array.isRequired,
  activeViewportsData: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  updateViewportPreview: PropTypes.func.isRequired,
  enableViewports: PropTypes.func.isRequired,
  disableViewport: PropTypes.func.isRequired,
  toggleAnnotations: PropTypes.func.isRequired,
  loadImage: PropTypes.func.isRequired,
  downloadBlob: PropTypes.func.isRequired,
};

export default ViewportPrintForm;
