export type PrintResponse = { type: 'pdf'; blob: Blob } | { type: 'dicom'; message: string };

export const sendPrint = async (form: FormData): Promise<PrintResponse> => {
  const resp = await fetch(`${process.env.BACKEND_URL}/send_print/`, {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    let msg = 'Error al enviar la imagen para impresión';
    try {
      const err = await resp.json();
      if (err?.message) {
        msg = err.message;
      }
    } catch { }
    throw new Error(msg);
  }

  const contentType = resp.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/pdf')) {
    const blob = await resp.blob();
    return { type: 'pdf', blob };
  }

  const data = await resp.json();
  return { type: 'dicom', message: data.message ?? 'Operación completada con éxito.' };
};
