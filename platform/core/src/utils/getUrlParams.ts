import qs from 'query-string';

export interface GetUrlParamsReturn {
  client: string;
  id: string;
  url: string;
  isAuthorized: boolean;
  sede: string;
  date: string;
}

const getUrlParams = (saveValue = false): GetUrlParamsReturn => {
  const { query } = qs.parseUrl(window.location.href);

  const unparsedId = query.id as string;
  const client = (query.cl as string) || '';
  const sede = (query.sd as string) || '';
  const date = (query.dt as string) || '';

  if (!unparsedId || unparsedId.length < 2) {
    throw new Error('El parámetro "id" es inválido o está ausente.');
  }

  const id = unparsedId.slice(0, unparsedId.length - 2);
  const authorization = unparsedId.slice(-1) || '0';

  if (saveValue) {
    localStorage.setItem('auth', JSON.stringify(authorization));
  }

  const url = `${process.env.MEASUREMENT_URL}/annotations/${id}?cl=${client}`;

  const storedAuth = JSON.parse(localStorage.getItem('auth') || '0');
  const isAuthorized = storedAuth === 1 || authorization === '1';

  return { client, id, url, isAuthorized, sede, date };
};

export default getUrlParams;
