import * as utils from './index';

describe('Top level exports', () => {
  test('should export the modules ', () => {
    const expectedExports = [
      'guid',
      'ObjectPath',
      'absoluteUrl',
      'seriesSortCriteria',
      'sortBy',
      'sortStudy',
      'sortBySeriesDate',
      'sortStudyInstances',
      'sortStudySeries',
      'sortingCriteria',
      'splitComma',
      'getSplitParam',
      'isLowPriorityModality',
      'writeScript',
      'debounce',
      'downloadCSVReport',
      'imageIdToURI',
      'roundNumber',
      'b64toBlob',
      'sopClassDictionary',
      'createStudyBrowserTabs',
      'formatDate',
      'formatTime',
      'formatPN',
      'generateAcceptHeader',
      'isEqualWithin',
      //'loadAndCacheDerivedDisplaySets',
      'isDisplaySetReconstructable',
      'isImage',
      'urlUtil',
      'makeDeferred',
      'makeCancelable',
      'hotkeys',
      'Queue',
      'isDicomUid',
      'resolveObjectPath',
      'hierarchicalListUtils',
      'progressTrackingUtils',
      'uuidv4',
      'addAccessors',
      'MeasurementFilters',
    ].sort();

    const exports = Object.keys(utils.default).sort();

    expect(exports).toEqual(expectedExports);
  });
});
