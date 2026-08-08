import { getUrlParams, GetUrlParamsReturn } from '../../utils';
const removePointsTools = ['EllipticalROI', 'RectangleROI', 'CircleROI'];

interface pdfDataProps {
  exist: boolean;
  pdf: Blob | null;
}

export interface HistorialItem {
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

export interface HistorialResponse {
  // Feature flag por sede (Sede.historial_habilitado en el backend): si es
  // false, el historial está apagado para esa sede y items siempre viene [].
  enabled: boolean;
  items: HistorialItem[];
}

class AsyncEndpoints {
  public memoizedParams: GetUrlParamsReturn | null = null;
  public permissions: GetUrlParamsReturn['permissions'] = {
    view_measurements: false,
    perform_measurements: false,
    save_measurements: false,
    view_report: false,
    edit_report: false,
  };
  public client = '';
  public sede = '';
  public baseUrl = 'localhost:3004';
  public urlMeasurements = `${this.baseUrl}/annotations`;
  public backendUrl = '';
  public pdfData: pdfDataProps = {
    exist: false,
    pdf: null,
  };

  constructor() {
    this.memoizedParams = null;
    const { permissions, client, sede, url } = this.getUrlParams();
    this.permissions = permissions;
    this.client = client;
    this.sede = sede;
    this.baseUrl = process.env.MEASUREMENT_URL;
    this.backendUrl = process.env.BACKEND_URL;
    this.urlMeasurements = url;
    this.pdfData = {
      exist: false,
      pdf: null,
    };
  }

  existPdf() {
    return this.pdfData.exist;
  }
  getPdf() {
    return this.pdfData.pdf;
  }

  removePointsInShape(annotation) {
    if (
      annotation?.data?.cachedStats &&
      annotation?.metadata &&
      removePointsTools.includes(annotation.metadata.toolName)
    ) {
      for (const key in annotation.data.cachedStats) {
        if (annotation.data.cachedStats[key]?.pointsInShape) {
          delete annotation.data.cachedStats[key].pointsInShape;
        }
      }
    }
    return annotation;
  }

  getUrlParams(): GetUrlParamsReturn {
    if (this.memoizedParams) {
      return this.memoizedParams;
    }
    this.memoizedParams = getUrlParams();
    return this.memoizedParams;
  }

  async verifyReport() {
    if (this.existPdf()) {
      return { exists: this.existPdf() };
    }

    const params = this.getUrlParams();
    const queryString = new URLSearchParams({
      Sede: params.sede,
      Fecha: params.date,
      Cliente: params.client,
      Uid: params.id,
    }).toString();

    const url = `${this.backendUrl}/reports/verify_report/?${queryString}`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const rep = await response.json();
      this.pdfData.exist = rep.exist;
      return rep;
    } catch (error) {
      throw new Error(`Error fetching Blob: ${error.message}`);
    }
  }

  async getPdfBlob() {
    // Devuelve la URL del blob almacenado si ya existe
    if (this.pdfData.pdf) {
      return Promise.resolve(URL.createObjectURL(this.pdfData.pdf));
    }

    const params = this.getUrlParams();
    const queryString = new URLSearchParams({
      Sede: params.sede,
      Fecha: params.date,
      Cliente: params.client,
      Uid: params.id,
    }).toString();

    try {
      const response = await fetch(`${this.backendUrl}/reports/get_report/?${queryString}`, {
        method: 'GET',
      });

      if (response.status === 404) {
        return Promise.reject(new Error('El archivo no existe'));
      }

      if (response.status >= 200 && response.status < 300) {
        const blob = await response.blob();
        this.pdfData.pdf = new Blob([blob], { type: 'application/pdf' });
        return Promise.resolve(URL.createObjectURL(this.pdfData.pdf));
      } else {
        return Promise.reject(new Error('Error al obtener el archivo'));
      }
    } catch (error) {
      return Promise.reject(new Error('Error obteniendo el pdf: ' + error.message));
    }
  }

  async getHistorial(): Promise<HistorialResponse> {
    const params = this.getUrlParams();

    try {
      const response = await fetch(
        `${this.backendUrl}/estudio/historial/?Uid=${encodeURIComponent(params.id)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error obteniendo historial: ${error.message}`);
    }
  }

  // Independiente de pdfData/getPdfBlob (que cachea el informe del estudio
  // actual): esto obtiene el PDF firmado de un estudio PREVIO, sin caché,
  // para el modal de "ver informe" del panel de Historial.
  async getPdfBlobFor(params: {
    sede: string;
    date: string;
    client: string;
    uid: string;
  }): Promise<string> {
    const queryString = new URLSearchParams({
      Sede: params.sede,
      Fecha: params.date,
      Cliente: params.client,
      Uid: params.uid,
    }).toString();

    try {
      const response = await fetch(`${this.backendUrl}/reports/get_report/?${queryString}`, {
        method: 'GET',
      });

      if (response.status === 404) {
        throw new Error('El archivo no existe');
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error('Error al obtener el archivo');
      }

      const blob = await response.blob();
      return URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    } catch (error) {
      throw new Error('Error obteniendo el pdf: ' + error.message);
    }
  }

  async getMeasurements() {
    if (!this.memoizedParams?.permissions.view_measurements) {
      throw new Error('Error: permisos insuficientes');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.urlMeasurements, { signal: controller.signal });
      clearTimeout(timeout);
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      } else {
        throw new Error('Error:', error);
      }
    }
  }

  async updateMeasurementLabel(measurementUID, measurement) {
    if (!this.memoizedParams.permissions.save_measurements) {
      console.error('User is not authorized');
      return;
    }

    const url = `${this.baseUrl}/annotation_update/${measurementUID}/?cl=${this.client}&sd=${this.sede}`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'annotation.data.label': measurement.label,
      }),
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out');
      } else {
        console.error('Error:', error);
      }
    }
  }

  async handleMeasurementUpdate(newMeasurement, oldMeasurement, annotation) {
    const differenceInSeconds = Math.abs(
      newMeasurement.modifiedTimestamp - oldMeasurement.modifiedTimestamp
    );

    if (
      differenceInSeconds >= 1 &&
      this.permissions.save_measurements &&
      (!newMeasurement?.changeType || newMeasurement.changeType === 'Completed')
    ) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

        const response = await fetch(
          `${this.baseUrl}/annotation_update/${annotation.uid}/?cl=${this.client}&sd=${this.sede}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(annotation),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        return await response.json();
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Request timed out');
        } else {
          console.error('Error:', error);
        }
      }
    }
  }

  async handleCreateMeasurement(newMeasurement) {
    if (!this.memoizedParams?.permissions.save_measurements) {
      console.error('User is not authorized');
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const response = await fetch(
        `${this.baseUrl}/create_annotation/?cl=${this.client}&sd=${this.sede}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMeasurement),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out');
      } else {
        console.error('Error:', error);
      }
    }
  }

  async handleDeleteMeasurement(measurementUID) {
    if (!this.memoizedParams?.permissions.save_measurements) {
      console.error('User is not authorized');
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const response = await fetch(
        `${this.baseUrl}/delete_annotation/${measurementUID}?cl=${this.client}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out');
      } else {
        console.error('Error:', error);
      }
    }
  }
}

export default AsyncEndpoints;
