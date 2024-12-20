import { getUrlParams } from '../../utils';
const removePointsTools = ['EllipticalROI', 'RectangleROI', 'CircleROI'];

interface pdfDataProps {
  exist: boolean;
  verified: boolean;
  pdf: Blob | null;
}

class AsyncEndpoints {
  public memoizedParams = null;
  public isAuthorized: boolean = false;
  public client = '';
  public sede = '';
  public baseUrl = 'localhost:3004';
  public urlMeasurements = `${this.baseUrl}/annotations`;
  public backendUrl = '';
  public pdfData: pdfDataProps = {
    exist: false,
    verified: false,
    pdf: null,
  };

  constructor() {
    this.memoizedParams = null;
    const { isAuthorized, client, sede, url } = this.getUrlParams();
    this.isAuthorized = isAuthorized;
    this.client = client;
    this.sede = sede;
    this.baseUrl = process.env.MEASUREMENT_URL;
    this.backendUrl = process.env.BACKEND_URL;
    this.urlMeasurements = url;
    this.pdfData = {
      exist: false,
      verified: false,
      pdf: null,
    };
  }

  existPdf() {
    return this.pdfData.exist;
  }
  isVerifiedPdf() {
    return this.pdfData.verified;
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

  getUrlParams() {
    if (this.memoizedParams) {
      return this.memoizedParams;
    }
    this.memoizedParams = getUrlParams();
    return this.memoizedParams;
  }

  async verifyReport() {
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
      const rep = response.json();
      this.pdfData.exist = rep.exist;
      return rep;
    } catch (error) {
      throw new Error(`Error fetching Blob: ${error.message}`);
    }
  }

  async getMeasurements() {
    if (!this.isAuthorized) {
      console.error('User is not authorized');
      return;
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
    if (!this.isAuthorized) {
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
      this.isAuthorized &&
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
