import viewCode from './viewCode';
import laterality from './laterality';
import mgAutoAllowed from './mgAutoAllowed';

export default function registerHangingProtocolAttributes({ servicesManager }) {
  const { hangingProtocolService } = servicesManager.services;
  hangingProtocolService.addCustomAttribute('ViewCode', 'View Code Designator:Value', viewCode);
  hangingProtocolService.addCustomAttribute('Laterality', 'Laterality of object', laterality);
  hangingProtocolService.addCustomAttribute(
    'mgAutoAllowed',
    'MG auto layout allowed for site',
    mgAutoAllowed
  );
}
