import { useState, useEffect } from 'react';
import { utils, Types } from '@ohif/core';
import { useTranslation } from 'react-i18next';

const { formatPN, formatDate, formatTime, formatPatientAge } = utils;

export default function usePatientInfo(servicesManager: AppTypes.ServicesManager): {
  patientInfo: Types.PatientInfo;
  isMixedPatients: boolean;
} {
  const { displaySetService } = servicesManager.services;
  const { t } = useTranslation('PatientInfo');
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

    const { StudyDate: studyDate, StudyTime: studyTime, PatientAge } = instance;
    const AGE =
      formatPatientAge(PatientAge) || formatDate(instance.PatientBirthDate) || t('unknown');
    const dateFormatted = formatDate(studyDate);
    const hourFormatted = formatTime(studyTime);
    const patientSex = instance.PatientSex
      ? instance.PatientSex === 'F'
        ? t('Female')
        : t('Male')
      : '-';

    setPatientInfo({
      PatientID: instance.PatientID || '',
      PatientName:
        instance.PatientName?.length > 0
          ? formatPN(instance.PatientName[0]?.Alphabetic || t('Unknown'))
          : t('Unknown'),
      PatientSex: patientSex,
      PatientDOB: AGE,
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
