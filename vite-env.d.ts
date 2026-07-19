/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Déclarations pour les modules externes
declare module 'frappe-charts' {
  export class Chart {
    constructor(element: HTMLElement, options: any);
    update(data: any): void;
    destroy(): void;
  }
}

// Déclarations pour les modules React
declare module '*.tsx' {
  const content: any;
  export default content;
}

declare module '*.ts' {
  const content: any;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_GPS_WEBHOOK_URL?: string
  readonly VITE_APP_VERSION?: string
}
