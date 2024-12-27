import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '@ohif/ui-next';
import DividerItem from './DividerItem';

type BackItemProps = {
  backLabel?: string;
  onBackClick: () => void;
};

const BackItem = ({ backLabel, onBackClick }: BackItemProps) => {
  const { t } = useTranslation('WindowLevelActionMenu');
  return (
    <>
      <div
        className="all-in-one-menu-item all-in-one-menu-item-effects"
        onClick={onBackClick}
      >
        <Icons.ByName name="content-prev"></Icons.ByName>

        <div className="pl-2">{t(backLabel || 'Back to Display Options')}</div>
      </div>
      <DividerItem></DividerItem>
    </>
  );
};

export default BackItem;
