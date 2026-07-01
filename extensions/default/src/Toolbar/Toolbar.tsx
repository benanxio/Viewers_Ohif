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
  const { permissions } = getUrlParams();

  const filterButtons = useMemo(() => {
    if (!toolbarButtons) {
      return [];
    }

    return toolbarButtons.filter(tb => {
      const isMobileOption = MOBILE_OPTIONS.includes(tb.id);
      const isAuthOption = AUTH_OPTIONS.includes(tb.id);

      // Ocultar 'Magnify' en cualquier caso
      if (tb.id === 'Magnify') {
        return isMobile;
      }

      // Si es móvil
      if (isMobile) {
        // Mostrar opciones móviles siempre
        if (isMobileOption) {
          return true;
        }
        // Mostrar opciones autorizadas solo si está autorizado
        if (permissions.perform_measurements && isAuthOption) {
          return true;
        }
        return false; // Ocultar las demás
      }

      // Si no es móvil
      if (permissions.perform_measurements) {
        // Mostrar todas las opciones autorizadas y las no restringidas
        return true;
      }

      // Si no está autorizado, ocultar opciones de autorización
      return !isAuthOption;
    });
  }, [isMobile, toolbarButtons, permissions]);

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
