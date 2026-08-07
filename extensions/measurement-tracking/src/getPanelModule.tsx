import { Types } from '@ohif/core';
import {
  PanelMeasurementTableTracking,
  PanelStudyBrowserTracking,
  PanelReport,
  PanelHistory,
} from './panels';
import i18n from 'i18next';
import React from 'react';

// TODO:
// - No loading UI exists yet
// - cancel promises when component is destroyed
// - show errors in UI for thumbnails if promise fails

function getPanelModule({ commandsManager, extensionManager, servicesManager }): Types.Panel[] {
  return [
    {
      name: 'seriesList',
      iconName: 'tab-studies',
      iconLabel: 'Studies',
      label: i18n.t('SidePanel:Studies'),
      component: props => (
        <PanelStudyBrowserTracking
          {...props}
          commandsManager={commandsManager}
          extensionManager={extensionManager}
          servicesManager={servicesManager}
        />
      ),
    },
    {
      name: 'trackedMeasurements',
      iconName: 'tab-linear',
      iconLabel: 'Measure',
      label: i18n.t('SidePanel:Measurements'),
      component: props => (
        <PanelMeasurementTableTracking
          {...props}
          commandsManager={commandsManager}
          extensionManager={extensionManager}
          servicesManager={servicesManager}
        />
      ),
    },
    // Custom Xpectria panel
    {
      name: 'report',
      iconName: 'ReportIcon',
      iconLabel: 'Informar',
      label: 'Informar',
      component: props => (
        <PanelReport
          {...props}
          commandsManager={commandsManager}
          extensionManager={extensionManager}
          servicesManager={servicesManager}
        />
      ),
    },
    // Custom Xpectria panel
    {
      name: 'history',
      iconName: 'HistoryIcon',
      iconLabel: 'Historial',
      label: 'Historial',
      component: props => (
        <PanelHistory
          {...props}
          commandsManager={commandsManager}
          extensionManager={extensionManager}
          servicesManager={servicesManager}
        />
      ),
    },
  ];
}

export default getPanelModule;
