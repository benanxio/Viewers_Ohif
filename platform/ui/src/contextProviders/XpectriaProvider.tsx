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

  const { isLoading, errorMessage } = options;

  return (
    <Provider value={{}}>
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
