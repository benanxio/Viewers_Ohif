import React from 'react';
import { utils } from '@ohif/core';

const { getUrlParams } = utils;

// Simple first pass: renders the RIS report editor as a regular SidePanel
// tab (same slide-open mechanism as "Mediciones"), so no new tab/modal is
// needed. `embed=1` tells the RIS to hide its own NavBar/chat so only the
// report content shows here.
function PanelReport() {
  const { permissions, id } = getUrlParams();

  if (!permissions.edit_report) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-center text-white">
        No tiene los permisos suficientes para informar este estudio.
      </div>
    );
  }

  return (
    <iframe
      src={`${process.env.FRONT_URL}/Report/${id}?embed=1`}
      className="h-full w-full border-0"
      title="Informar"
    />
  );
}

export default PanelReport;
