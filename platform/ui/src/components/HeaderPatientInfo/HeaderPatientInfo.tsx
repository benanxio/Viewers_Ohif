import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@ohif/ui';
import { utils } from '@ohif/core';
import { PatientInfoVisibility } from '../../types';
import classNames from 'classnames';

const { formatDate, formatPN, formatTime } = utils;

const formatWithEllipsis = (str, maxLength) => {
  if (str?.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

export function usePatientInfo(servicesManager: AppTypes.ServicesManager) {
  const { displaySetService } = servicesManager.services;

  const [patientInfo, setPatientInfo] = useState({
    PatientName: '',
    PatientID: '',
    PatientSex: '',
    PatientDOB: '',
    StudyDescription: '',
    StudyCapture: '',
  });
  const [isMixedPatients, setIsMixedPatients] = useState(false);
  const displaySets = displaySetService.getActiveDisplaySets();

  const checkMixedPatients = PatientID => {
    const displaySets = displaySetService.getActiveDisplaySets();
    let isMixedPatients = false;
    displaySets.forEach(displaySet => {
      const instance = displaySet?.instances?.[0] || displaySet?.instance;
      if (!instance) {
        return;
      }
      if (instance.PatientID !== PatientID) {
        isMixedPatients = true;
      }
    });
    setIsMixedPatients(isMixedPatients);
  };

  const updatePatientInfo = () => {
    const displaySet = displaySets[0];
    const instance = displaySet?.instances?.[0] || displaySet?.instance;

    if (!instance) {
      return;
    }

    const { AcquisitionDate: studyDate, AcquisitionTime: studyTime, PatientAge } = instance;
    const AGE = formatDate(instance.PatientBirthDate) || parseInt(PatientAge, 10) || 'Sin';
    const dateFormatted = formatDate(studyDate);
    const hourFormatted = formatTime(studyTime);

    setPatientInfo({
      PatientID: instance.PatientID || '',
      PatientName:
        instance.PatientName?.length > 0
          ? formatPN(instance.PatientName[0]?.Alphabetic || 'Sin nombre')
          : 'Sin nombre',
      PatientSex: instance.PatientSex || '-',
      PatientDOB: `${AGE} años` || '-',
      StudyCapture:
        dateFormatted === 'Invalid date' || hourFormatted === 'Invalid date'
          ? '-'
          : `${dateFormatted}, ${hourFormatted}h`,
      StudyDescription: instance.StudyDescription,
    });
    checkMixedPatients(instance.PatientID || '');
  };

  useEffect(() => {
    const subscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      () => updatePatientInfo()
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    updatePatientInfo();
  }, [displaySets]);

  return { patientInfo, isMixedPatients };
}
function HeaderPatientInfo({ servicesManager, appConfig, isMobile = false }: withAppTypes) {
  const initialExpandedState =
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE ||
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE_READONLY ||
    isMobile;
  const [expanded, setExpanded] = useState(initialExpandedState);
  const { patientInfo, isMixedPatients } = usePatientInfo(servicesManager);

  useEffect(() => {
    if (isMixedPatients && expanded) {
      setExpanded(false);
    }
  }, [isMixedPatients, expanded]);

  const handleOnClick = () => {
    if (
      !isMixedPatients &&
      appConfig.showPatientInfo !== PatientInfoVisibility.VISIBLE_READONLY &&
      !isMobile
    ) {
      setExpanded(!expanded);
    }
  };

  const formattedPatientName = formatWithEllipsis(patientInfo.PatientName, 27);
  const formattedPatientID = formatWithEllipsis(patientInfo.PatientID, 15);

  return (
    <div
      className={classNames(
        'hover:bg-primary-dark flex cursor-pointer items-center justify-center gap-1 rounded-lg',
        { 'h-[80px]': isMobile }
      )}
      onClick={handleOnClick}
    >
      <Icon
        name={isMixedPatients ? 'icon-multiple-patients' : 'icon-patient'}
        className={classNames('text-primary-active', { hidden: isMobile })}
      />
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
            {' '}
            {isMixedPatients ? 'Multiple Patients' : 'Patient'}
          </div>
        )}
      </div>
      {!isMobile && (
        <Icon
          name="icon-chevron-patient"
          className={`text-primary-active ${expanded ? 'rotate-180' : ''}`}
        />
      )}
    </div>
  );
}

HeaderPatientInfo.propTypes = {
  servicesManager: PropTypes.object.isRequired,
};

export default HeaderPatientInfo;
