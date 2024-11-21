interface getPrintersPromise {
  id: number;
  nombre_modelo: string;
}
export const getPrinters = async (sede: string): Promise<getPrintersPromise[]> => {
  try {
    const resp = await fetch(`${process.env.BACKEND_URL}/impresoras/?sede=${sede}`);

    if (!resp.ok) {
      throw new Error('Error al listar impresoras');
    }

    const data = await resp.json();
    return data;
  } catch (error) {
    throw new Error('Error al listar impresoras');
  }
};
