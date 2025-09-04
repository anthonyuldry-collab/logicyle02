/// <reference types="vite/client" />

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
