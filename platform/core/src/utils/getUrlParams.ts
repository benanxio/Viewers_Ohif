import qs from 'query-string';

const KEY = parseInt(process.env.FLAG_KEY!, 16);
const MEASUREMENT_URL = process.env.MEASUREMENT_URL || '';
const POS_PERMISSION = 4;

function decodeFlags(str: string): boolean[] {
  const obf = parseInt(str, 36);
  const mask = obf ^ KEY;
  return Array.from({ length: 5 }, (_, i) => Boolean(mask & (1 << i)));
}

export function encodeFlags(flags: boolean[]): string {
  const mask = flags.reduce((m, f, i) => m | ((f ? 1 : 0) << i), 0);
  const obf = mask ^ KEY;
  return obf.toString(36);
}

export interface JSONPermission {
  view_measurements: boolean;
  perform_measurements: boolean;
  save_measurements: boolean;
  view_report: boolean;
  edit_report: boolean;
}

export interface GetUrlParamsReturn {
  client: string;
  clientAlias: string;
  id: string;
  url: string;
  sede: string;
  date: string;
  permissions: JSONPermission;
  version: 'v1' | 'v2';
}

interface V1Permissions {
  '0': JSONPermission;
  '1': JSONPermission;
  '2': JSONPermission;
}

const OLD_PERMISSIONS: V1Permissions = {
  '0': {
    view_measurements: false,
    perform_measurements: false,
    save_measurements: false,
    view_report: true,
    edit_report: false,
  },
  '1': {
    view_measurements: true,
    perform_measurements: true,
    save_measurements: true,
    view_report: true,
    edit_report: true,
  },
  '2': {
    view_measurements: true,
    perform_measurements: true,
    save_measurements: true,
    view_report: false,
    edit_report: false,
  },
};

const CLIENTS_ALIAS: Record<string, string> = {
  'Hospital-Prueba': 'Hospital Maria Auxiliadora',
  'Policlinico-Izaguirre': 'Clinica Izaguirre',
};

const getUrlParams = (saveValue = false): GetUrlParamsReturn => {
  const { query } = qs.parseUrl(window.location.href);

  const unparsedId = query.id as string;
  const client = (query.cl as string) || '';
  const sede = (query.sd as string) || '';
  const date = (query.dt as string) || '';
  const clientAlias = CLIENTS_ALIAS[client] || client;

  if (!unparsedId || unparsedId.length < 2) {
    throw new Error('El parámetro "id" es inválido o está ausente.');
  }

  let id = unparsedId.slice(POS_PERMISSION, unparsedId.length);
  let authorization = unparsedId.slice(0, POS_PERMISSION + 1); //?
  let version: GetUrlParamsReturn['version'] = 'v2';

  let permissions: JSONPermission = {
    view_measurements: false,
    perform_measurements: false,
    save_measurements: false,
    view_report: false,
    edit_report: false,
  };

  if (authorization.includes('v2')) {
    authorization = authorization.slice(0, 1);
    const DecodedList = decodeFlags(authorization);
    permissions = {
      view_measurements: DecodedList?.[0] || false,
      perform_measurements: DecodedList?.[1] || false,
      save_measurements: DecodedList?.[2] || false,
      view_report: DecodedList?.[3] || false,
      edit_report: DecodedList?.[4] || false,
    };
  } else {
    id = unparsedId.slice(0, unparsedId.length - 2);
    const v1Auth = (unparsedId.at(-1) || '0') as keyof V1Permissions;
    permissions = OLD_PERMISSIONS[v1Auth] || OLD_PERMISSIONS[0];
    authorization = encodeFlags([
      permissions.view_measurements,
      permissions.perform_measurements,
      permissions.save_measurements,
      permissions.view_report,
      permissions.edit_report,
    ]);
    version = 'v1';
  }

  if (saveValue) {
    localStorage.setItem('xflag', JSON.stringify(authorization));
  }

  const url = `${MEASUREMENT_URL}/annotations/${id}?cl=${client}`;
  return { client, id, url, sede, date, permissions, version, clientAlias };
};

export default getUrlParams;
