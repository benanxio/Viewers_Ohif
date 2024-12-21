import React, { useEffect, useState } from 'react';
import { LoadingIndicatorProgress } from '@ohif/ui';

function PdfReportContent({
  pdfPromise,
  onCloseModal,
  isMobile,
}: {
  pdfPromise: Promise<string>;
  onCloseModal: () => void;
  isMobile: boolean;
}) {
  const [loader, setLoader] = useState(true);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const urlResp = await pdfPromise;
        setUrl(urlResp);
      } catch (error) {
        console.error(error);
      } finally {
        setLoader(false);
      }
    };

    load();
  }, [pdfPromise]);

  useEffect(() => {
    if (isMobile && url) {
      window.open(url, '_blank');
      onCloseModal();
    }
  }, [isMobile, url, onCloseModal]);

  return (
    <div className="bg-primary-black relative h-[70dvh] w-[90vw] text-white sm:w-[70vw] lg:w-[50vw]">
      {loader && (
        <LoadingIndicatorProgress
          textBlock={'Cargando Reporte'}
          className={'bg-secondary-dark h-full w-full'}
        />
      )}
      {!isMobile && url ? (
        <object
          data={url}
          type="application/pdf"
          className="h-full w-full"
        >
          <div>No se puede visualizar el reporte</div>
        </object>
      ) : (
        <div>Reporte abierto en nueva pestaña, cierre esta ventana</div>
      )}
    </div>
  );
}

export default PdfReportContent;
