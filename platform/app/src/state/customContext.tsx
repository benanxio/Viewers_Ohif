import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const customContext = createContext(null);
const { Provider: CustomProvider } = customContext;

export const useCustomContext = () => useContext(customContext);

export function CustomProviderContext({ children }) {
  const [totalData, setTotalData] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMPR, setShowMPR] = useState(false);
  const [studyPending, setStudyPending] = useState('');

  const details = useState(true);

  useEffect(() => {
    if (totalData.length === 0) {
      return;
    }

    let newState = totalData.some(item => !item.loading && item.instances?.length > 1);
    if (!newState && totalData.some(item => item.instances?.length > 1)) {
      return;
    } else {
      newState = true;
    }
    setShowMPR(newState);
  }, [totalData]);

  const isLoaded = (SerieId: string) => {
    return totalData.some(item => item.displaySetInstanceUID === SerieId && !item.loading);
  };

  const updateTotalData = (data: any[]) => {
    const newData = data
      .filter(dt => !totalData.some(td => td.displaySetInstanceUID === dt.displaySetInstanceUID))
      .map(mp => ({
        displaySetInstanceUID: mp.displaySetInstanceUID,
        Modality: mp.Modality,
        instances: mp.instances.map(it => it.url),
        studiesLoaded: mp.instances.length > 5 ? 0 : mp.instances.length,
        marginOfError:
          mp.instances.length -
          Math.ceil(
            mp.instances.length * Math.max(0.1 - Math.floor(mp.instances.length / 50) * 0.02, 0.01)
          ),
        loading: mp.instances.length > 5,
      }));

    setTotalData(prev => [...prev, ...newData]);
  };

  // Memorizar la función verifier usando useCallback
  const verifier = useCallback((studyUrl: string) => {
    setTotalData(prevTotalData => {
      const pos = prevTotalData.findIndex(td => td.instances.some(it => it.includes(studyUrl)));
      if (pos >= 0) {
        const updatedTotalData = prevTotalData.map((item, index) => {
          if (index === pos) {
            const newStudiesLoaded = item.studiesLoaded + 1;
            const isCompleted = newStudiesLoaded >= item.marginOfError;
            setStudyPending(
              isCompleted || item.instances.length < 5 || newStudiesLoaded < 2
                ? ''
                : item.displaySetInstanceUID
            );
            return {
              ...item,
              studiesLoaded: newStudiesLoaded,
              loading: !isCompleted,
            };
          }
          return item;
        });

        return updatedTotalData;
      }
      return prevTotalData;
    });
  }, []);

  useEffect(() => {
    CustomInterceptor(verifier);
    const checkDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isUserAgentMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      const isScreenSizeMobile = window.innerWidth <= 768;
      setIsMobile(isUserAgentMobile || isScreenSizeMobile);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, [verifier]);

  const values = {
    showMPR,
    updateTotalData,
    totalData,
    isMobile,
    isLoaded,
    studyPending,
    details,
  };

  return <CustomProvider value={values}>{children}</CustomProvider>;
}

CustomProviderContext.propTypes = {
  children: PropTypes.any,
};

export default CustomProviderContext;

function CustomInterceptor(verifier) {
  const originalXHR = window.XMLHttpRequest;

  function CustomXHR() {
    const xhr = new originalXHR();

    xhr.addEventListener('readystatechange', function () {
      if (xhr.readyState === 4 && verifier && xhr.status === 200) {
        verifier(xhr.responseURL);
      }
    });

    // Interceptar métodos abiertos para capturar el método y la URL
    const originalOpen = xhr.open;
    xhr.open = function (method, url) {
      xhr.method = method; // Guardar el método
      xhr.url = url; // Guardar la URL
      originalOpen.apply(xhr, arguments);
    };

    return xhr;
  }

  window.XMLHttpRequest = CustomXHR;
}
