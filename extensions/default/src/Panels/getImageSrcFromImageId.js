/**
 * @param {*} cornerstone
 * @param {*} imageId
 */
function getImageSrcFromImageId(cornerstone, imageId) {
  // Miniatura JPEG pregenerada por Sync_App (metadata.ThumbnailURL del JSON):
  // evita descargar el DICOM completo solo para dibujar la miniatura
  const thumbnailURL = cornerstone.metaData.get('instance', imageId)?.ThumbnailURL;
  if (thumbnailURL) {
    return loadThumbnailURL(thumbnailURL).catch(() => renderImageId(cornerstone, imageId));
  }

  return renderImageId(cornerstone, imageId);
}

function loadThumbnailURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Mismo modo que el <img crossOrigin="anonymous"> del Thumbnail, si no el navegador
    // reutiliza la respuesta cacheada sin CORS y la miniatura sale rota
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
}

function renderImageId(cornerstone, imageId) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    cornerstone.utilities
      .loadImageToCanvas({ canvas, imageId, thumbnail: true })
      .then(imageId => {
        resolve(canvas.toDataURL());
      })
      .catch(reject);
  });
}
export default getImageSrcFromImageId;
