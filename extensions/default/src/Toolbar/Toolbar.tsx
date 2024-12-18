import React, { useMemo } from 'react';
import { Tooltip } from '@ohif/ui';
import classnames from 'classnames';
import { useToolbar, utils } from '@ohif/core';

const { getUrlParams } = utils;

const MOBILE_OPTIONS = ['MeasurementTools', 'Magnify', 'Pan', 'WindowLevel'];
const AUTH_OPTIONS = ['Print', 'Report', 'Share'];

export function Toolbar({ servicesManager, buttonSection = 'primary', isMobile = false }) {
  const { toolbarButtons, onInteraction } = useToolbar({
    servicesManager,
    buttonSection,
  });
  const { isAuthorized } = getUrlParams();

  const filterButtons = useMemo(
    () =>
      toolbarButtons
        ? toolbarButtons.filter(tb => {
          if (tb.id === 'Magnify') {
            return isMobile;
          }
          return (
            MOBILE_OPTIONS.includes(tb.id) ||
            (!isMobile && tb.id !== 'Magnify') ||
            (AUTH_OPTIONS.includes(tb.id) && isAuthorized)
          );
        })
        : [],
    [isMobile, toolbarButtons, isAuthorized]
  );

  if (!toolbarButtons.length) {
    return null;
  }

  return (
    <>
      {filterButtons.map(toolDef => {
        if (!toolDef) {
          return null;
        }

        const { id, Component, componentProps } = toolDef;
        const tool = (
          <Component
            key={id}
            id={id}
            onInteraction={onInteraction}
            servicesManager={servicesManager}
            {...componentProps}
          />
        );

        return <div key={id}>{tool}</div>;
      })}
    </>
  );
}
