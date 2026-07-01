import React, { useState, useMemo } from 'react';
import Input from '../Input';
import IconButton from '../IconButton';
import { Icons } from '@ohif/ui-next';
import Button, { ButtonEnums } from '../Button';
import getUrlParams from '../../utils/getUrlParams';

const KEY = parseInt(process.env.FLAG_KEY!, 16);
const POS_PERMISSION = 4;

function encodeFlags(flags: boolean[]): string {
  // flags.length === 5
  const mask = flags.reduce((m, f, i) => m | ((f ? 1 : 0) << i), 0);
  const obf = mask ^ KEY;
  return obf.toString(36);
}

function ShareStudyForm({ onClose = () => { } }: { onClose: () => void }) {
  const [params] = useState(getUrlParams());

  const urlWithoutPermission = useMemo(() => {
    const url = window.location.href;

    const pos = url.indexOf(params.id);

    let start = '';
    let end = '';

    if (params.version === 'v2') {
      start = url.slice(0, pos - POS_PERMISSION);
      end = url.slice(pos);
    } else {
      start = url.slice(0, pos);
      end = params.id;
    }

    const newPermission = encodeFlags([false, false, false, true, false]);

    return start + newPermission + 'v2.' + end;
  }, [params]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(urlWithoutPermission);
    alert('Url de estudio copiado con éxito');
  };

  return (
    <div className="w-full p-4 text-white">
      <p className="mt-2">URL</p>
      <div className="flex w-full flex-row items-center justify-between">
        <Input
          autoFocus
          className="border-primary-main bg-black"
          type="text"
          readOnly={true}
          containerClassName="mr-2"
          value={urlWithoutPermission}
        />
        <IconButton
          size="toolbox"
          className="hover:bg-secondary-active h-[40px] w-[40px] rounded-[4px]"
          onClick={handleCopyToClipboard}
        >
          <Icons.ClipBoardIcon
            color="primary"
            className="cursor-pointer text-white"
          />
        </IconButton>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          name="cancel"
          type={ButtonEnums.type.secondary}
          onClick={onClose}
        >
          {'Cancelar'}
        </Button>
      </div>
    </div>
  );
}

export default ShareStudyForm;
