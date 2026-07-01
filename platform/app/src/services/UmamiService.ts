import { PubSubService } from '@ohif/core';
import { umamiWebsiteIds } from './umamiMapping';

const UMAMI_URL = 'https://pacs-test.files-xpectria.org';

// Same decodeFlags logic as getUrlParams.ts
const FLAG_KEY = parseInt(process.env.FLAG_KEY || '7b', 16);

function decodeFlags(str: string): boolean[] {
  const obf = parseInt(str, 36);
  const mask = obf ^ FLAG_KEY;
  return Array.from({ length: 5 }, (_, i) => Boolean(mask & (1 << i)));
}

interface UmamiWindow {
  track?: (eventName: string, data?: Record<string, unknown>) => void;
  identify?: (data?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    umami?: UmamiWindow;
  }
}

class UmamiService extends PubSubService {
  public static readonly EVENTS = {
    READY: 'ready',
    ERROR: 'error',
  };

  public static REGISTRATION = {
    name: 'umamiService',
    altName: 'UmamiService',
    create: ({}) => {
      return new UmamiService();
    },
  };

  private websiteId: string | null = null;
  private scriptInjected = false;
  private ready = false;
  private pendingEvents: Array<{ eventName: string; data?: Record<string, unknown> }> = [];

  constructor() {
    super(UmamiService.EVENTS);
  }

  /**
   * Inicializa el servicio de Umami.
   * Solo se activa si el usuario tiene permisos de measurement Y save.
   */
  public init(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const client = urlParams.get('cl') || '';
    const sede = urlParams.get('sd') || '';

    // Verificar permisos: ambos deben ser true
    const xflag = localStorage.getItem('xflag');
    if (!xflag) {
      return;
    }

    const hasPermission = this.checkPermissions(xflag);
    if (!hasPermission) {
      return;
    }

    const mappingKey = `${client}_${sede}`;
    const websiteId = umamiWebsiteIds[mappingKey];

    if (!websiteId) {
      console.warn(`[Umami] No website-id found for: ${mappingKey}`);
      return;
    }

    this.websiteId = websiteId;

    // Inject the Umami script. We do NOT pre-set window.umami here —
    // Umami's own script must own window.umami so its real track() is installed.
    this.injectScript();

    this._broadcastEvent(UmamiService.EVENTS.READY, { websiteId });
  }

  /**
   * Checks if both perform_measurements and save_measurements are true.
   * @param xflag - The encoded permission flags from localStorage (JSON string)
   */
  private checkPermissions(xflag: string): boolean {
    try {
      // xflag is stored as JSON.stringify(authorization) where authorization is a string
      const authorization = JSON.parse(xflag);

      // Decode the flags using same logic as getUrlParams.ts
      // Returns [view_measurements, perform_measurements, save_measurements, view_report, edit_report]
      const decoded = decodeFlags(authorization);
      const perform_measurements = decoded?.[1] ?? false;
      const save_measurements = decoded?.[2] ?? false;

      return perform_measurements && save_measurements;
    } catch {
      return false;
    }
  }

  /**
   * Injects the Umami script. When loaded, wraps the real track() to add page name.
   */
  private injectScript(): void {
    if (this.scriptInjected || !this.websiteId) {
      return;
    }

    const existing = document.getElementById('umami-script');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = 'umami-script';
    script.async = true;
    script.src = `${UMAMI_URL}/script.js`;
    script.setAttribute('data-website-id', this.websiteId);
    script.setAttribute('data-domains', window.location.hostname);
    // Disable automatic pageview tracking — we only want custom events
    // script.setAttribute('data-auto-track', 'false');

    script.onerror = () => {
      this._broadcastEvent(UmamiService.EVENTS.ERROR, { message: 'Script load failed' });
    };

    script.onload = () => {

      if (!window.umami?.track) {
        console.warn('[Umami] No track function after load!');
        return;
      }

      this.ready = true;
      this.flushPendingEvents();
    };

    document.head.appendChild(script);
    this.scriptInjected = true;
  }

  /**
   * Flushes any events that were queued before the script finished loading.
   */
  private flushPendingEvents(): void {
    if (!this.ready || !window.umami?.track) {
      return;
    }

    while (this.pendingEvents.length > 0) {
      const { eventName, data } = this.pendingEvents.shift()!;
      window.umami.track(eventName, data);
    }
  }

  /**
   * Track an event to Umami. Use this from anywhere via servicesManager,
   * or call window.umami?.track() directly once the script has loaded.
   * @param eventName - Name of the event (e.g., 'viewer_measurement_created')
   * @param data - Additional event data
   */
  public track(eventName: string, data?: Record<string, unknown>): void {
    if (!this.websiteId) {
      return;
    }

    if (this.ready && window.umami?.track) {
      window.umami.track(eventName, data);
    } else {
      // Script not loaded yet — queue it
      this.pendingEvents.push({ eventName, data });
    }
  }
}

export default UmamiService;
