import { utils, Types, ViewportGridService } from '@ohif/core';
import { Switch, Tooltip, TooltipContent } from '@ohif/ui-next';
import { Icon } from '@ohif/ui';
import classNames from 'classnames';
import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

const { getUrlParams } = utils;
const textSizes = {
  '1': 'text-xs sm:text-lg',
  '2': 'text-xs sm:text-base',
  '3': 'text-xs sm:text-sm',
  '4': 'text-xs sm:text-sm',
  '5': 'text-xs',
  '6': 'text-[12px]',
  default: 'text-[10px]',
};

const StudyDetails: React.FC<{
  patientInfo: Types.PatientInfo;
  viewportGridService: ViewportGridService;
  details: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}> = ({ patientInfo, viewportGridService, details }) => {
  const [showDetails, setShowDetails] = details;
  const { viewports } = viewportGridService.getState();
  const { t } = useTranslation('PatientInfo');
  const params = getUrlParams();

  const textSizeClass = textSizes[viewports.size] || textSizes['default'];

  return (
    <Fragment>
      <Switch
        checked={showDetails}
        onCheckedChange={setShowDetails}
        className="pointer-events-auto"
      />
      <Tooltip>
        <TooltipContent>
          <div className="flex py-2">
            <div className="flex pt-1">
              <Icon
                name="info-link"
                className="text-primary-main w-4"
              />
            </div>
            <div className="ml-4 flex">
              <span className="text-common-main text-base">{'Ocultar/Mostrar detalles'}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
      <div
        className={classNames(
          'text-wrap whitespace-normal break-words leading-tight',
          textSizeClass,
          { hidden: !showDetails }
        )}
      >
        <p>
          <strong>{t('Patient')}:</strong> {patientInfo.PatientName}
        </p>
        <p>
          <strong> {t('Age')}:</strong> {patientInfo.PatientDOB}
        </p>
        <p>
          <strong>{t('Sex')}:</strong> {patientInfo.PatientSex}
        </p>
        <p>
          <strong>{t('Study')}:</strong> {patientInfo.StudyDescription}
        </p>
        <p>
          <strong>{t('Capture')}:</strong> {patientInfo.StudyCapture}
        </p>
        <p>
          <strong>{t('Organization')}:</strong> {params.client.replace(/-/g, ' ')}
        </p>
        <p>
          <strong>{t('Branch')}:</strong> {params.sede.replace(/-/g, ' ')}
        </p>
      </div>
    </Fragment>
  );
};

export default StudyDetails;
