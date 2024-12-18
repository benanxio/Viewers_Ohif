import React, { useState, useEffect } from 'react';
import { Icons, usePatientInfo } from '@ohif/ui-next';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

export enum PatientInfoVisibility {
  VISIBLE = 'visible',
  VISIBLE_COLLAPSED = 'visibleCollapsed',
  DISABLED = 'disabled',
  VISIBLE_READONLY = 'visibleReadOnly',
}

const formatWithEllipsis = (str, maxLength) => {
  if (str?.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

function HeaderPatientInfo({ servicesManager, appConfig, isMobile = false }: withAppTypes) {
  const initialExpandedState =
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE ||
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE_READONLY;
  const { t } = useTranslation('PatientInfo');
  const [expanded, setExpanded] = useState(initialExpandedState);
  const { patientInfo, isMixedPatients } = usePatientInfo(servicesManager);

  useEffect(() => {
    if (isMixedPatients && expanded) {
      setExpanded(false);
    }
  }, [isMixedPatients, expanded]);

  const handleOnClick = () => {
    if (!isMixedPatients && appConfig.showPatientInfo !== PatientInfoVisibility.VISIBLE_READONLY) {
      setExpanded(!expanded);
    }
  };

  const formattedPatientName = formatWithEllipsis(patientInfo.PatientName, 27);
  const formattedPatientID = formatWithEllipsis(patientInfo.PatientID, 15);

  return (
    <div
      className={classNames(
        'hover:bg-primary-main flex cursor-pointer items-center justify-center gap-1 rounded-lg',
        { 'h-[80px]': isMobile }
      )}
      onClick={handleOnClick}
    >
      {isMixedPatients ? (
        <Icons.MultiplePatients
          className={classNames('text-primary-active', { hidden: isMobile })}
        />
      ) : (
          <Icons.Patient className={classNames('text-primary-active', { hidden: isMobile })} />
      )}
      <div className="flex flex-col justify-center">
        {expanded ? (
          <>
            <div
              className={classNames(
                'self-start font-bold text-white',
                isMobile ? 'text-[15px]' : 'text-[13px]'
              )}
            >
              {formattedPatientName}
            </div>
            <div
              className={classNames(
                'text-common-main flex gap-2',
                isMobile ? 'items-center justify-center text-[13px]' : 'text-[11px]'
              )}
            >
              <div>{formattedPatientID}</div>
              <div>{patientInfo.PatientSex}</div>
              <div>{patientInfo.PatientDOB}</div>
            </div>
          </>
        ) : (
          <div className="text-primary-active self-center text-[13px]">
              {isMixedPatients ? t('Multiple Patients') : t('Patient')}
          </div>
        )}
      </div>
      <Icons.ChevronPatient
        className={classNames(
          'text-primary-active',
          { hidden: isMobile },
          { 'rotate-180': expanded }
        )}
      />
    </div>
  );
}

export default HeaderPatientInfo;
