import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { XpectriaService } from '@ohif/core';

const XpectriaContext = createContext(null);
const { Provider } = XpectriaContext;

const useXpectria = () => useContext(XpectriaContext);
/**
 * XpectriaProvider Component
 *
 * Configures and provides the `XpectriaService` instance to the application.
 */
const XpectriaProvider = ({ children, service = null }) => {
  const { t } = useTranslation('Xpectria');
  const DEFAULT_OPTIONS = {
    isLoading: false,
    errorMessage: null,
  };

  const [options, setOptions] = useState(DEFAULT_OPTIONS);

  /**
   * Define the `getFilePdfBlob` method using `useCallback`.
   */
  const getFilePdfBlob = useCallback(
    async (params: Record<string, string>) => {
      const queryString = new URLSearchParams(params).toString();
      const url = `${process.env.BACKEND_URL}/reports/verify_report/?${queryString}`;

      try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rep = response.json();
        service._broadcastEvent(XpectriaService.EVENTS.FETCH_SUCCESS, { url, rep });
        return rep;
      } catch (error: any) {
        service._broadcastEvent(XpectriaService.EVENTS.FETCH_ERROR, { url, error: error.message });
        throw new Error(`Error fetching Blob: ${error.message}`);
      }
    },
    [service]
  );

  /**
   * Attach the implementation of `getFilePdfBlob` to the service.
   */
  useEffect(() => {
    if (!service) {
      return;
    }

    console.log('XpectriaProvider', service);

    //const xpectriaService = service.REGISTRATION.create({ configuration: {} });
    service.setServiceImplementation({
      getFilePdfBlob,
    });
  }, [service, getFilePdfBlob]);

  const { isLoading, errorMessage } = options;

  return (
    <Provider value={{ getFilePdfBlob }}>
      {isLoading && <div>{t('Loading...')}</div>}
      {errorMessage && (
        <div>
          {t('Error:')} {errorMessage}
        </div>
      )}
      {children}
    </Provider>
  );
};

XpectriaProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  service: PropTypes.shape({
    EVENTS: PropTypes.object.isRequired,
  }).isRequired,
};

export { XpectriaProvider, XpectriaContext, useXpectria };
