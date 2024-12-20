import { PubSubService } from '../_shared/pubSubServiceInterface';
import XpectriaEndpoints from './XpectriaEndpoints';

class XpectriaService extends PubSubService {
  public static readonly EVENTS = {
    FETCH_SUCCESS: 'fetchSuccess',
    FETCH_ERROR: 'fetchError',
  };

  public static REGISTRATION = {
    name: 'xpectriaService',
    altName: 'XpectriaService',
    create: ({ configuration = {} }) => {
      return new XpectriaService();
    },
  };

  public XpectriaApi = new XpectriaEndpoints();

  constructor() {
    super(XpectriaService.EVENTS);
    this.serviceImplementation = {
      getFilePdfBlob: async (params: Record<string, string>) => {
        console.warn('getFilePdfBlob() NOT IMPLEMENTED');
        return null;
      },
    };
  }

  /**
   * Método público que llama a la implementación de `getFilePdfBlob`.
   * @param params - Parámetros para la solicitud.
   */
  public async getFilePdfBlob(params: Record<string, string>): Promise<any> {
    return this.serviceImplementation.getFilePdfBlob(params);
  }

  /**
   * Configura las implementaciones específicas para los métodos del servicio.
   * @param implementations - Implementaciones personalizadas.
   */
  public setServiceImplementation({ getFilePdfBlob }: { getFilePdfBlob?: Function }) {
    if (getFilePdfBlob) {
      this.serviceImplementation.getFilePdfBlob = getFilePdfBlob;
    }
  }
}

export default XpectriaService;
