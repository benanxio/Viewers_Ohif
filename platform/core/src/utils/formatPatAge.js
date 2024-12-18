import i18n from 'i18next';

/**
 * Parse and format PatientAge
 *
 * @param {string} patientAge Patient age string (e.g., "40Y", "3M", "15D")
 * @returns {string} Formatted age in the current language
 */
const formatPatientAge = patientAge => {
  if (!patientAge) {
    return '';
  }

  // Regex to match age format
  const ageRegex = /^(\d+)([DWMY])$/;
  const match = patientAge.match(ageRegex);

  if (!match) {
    console.error(i18n.t('Common:invalidAgeFormat', 'Invalid format'));
    return null;
  }

  const value = parseInt(match[1], 10); // Extract number
  const unit = match[2]; // Extract unit

  // Map unit to localized labels
  const unitsMap = {
    D: i18n.t('Common:days', 'days'),
    W: i18n.t('Common:weeks', 'weeks'),
    M: i18n.t('Common:months', 'months'),
    Y: i18n.t('Common:years', 'years'),
  };

  const unitLocalized = unitsMap[unit] || i18n.t('Common:unknownUnit', 'unknown unit');

  // Return formatted string
  return i18n.t('Common:formattedAge', '{{value}} {{unit}}', { value, unit: unitLocalized });
};

export default formatPatientAge;
