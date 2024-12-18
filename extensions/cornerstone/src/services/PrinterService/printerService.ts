export const sendPrint = async (form: FormData): Promise<{ message: string }> => {
  try {
    const resp = await fetch(`${process.env.BACKEND_URL}/send_print/`, {
      method: 'POST',
      body: form,
    });

    if (!resp.ok) {
      throw new Error('Error al enviar la imagen para impresión');
    }

    const data = await resp.json();
    return data;
  } catch (error) {
    throw new Error('Error al enviar la imagen para impresión');
  }
};
