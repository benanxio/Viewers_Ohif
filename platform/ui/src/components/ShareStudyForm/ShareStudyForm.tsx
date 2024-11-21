import React from 'react';
import Input from '../Input';
import IconButton from '../IconButton';
import Icon from '../Icon';
import Button, { ButtonEnums } from '../Button';

function ShareStudyForm({ onClose = () => { } }: { onClose: () => void }) {
  const url = window.location.href;
  const urlWithoutPermission = url.substring(0, url.length - 1) + '0';

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
          <Icon
            name="ClipBoardIcon"
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
