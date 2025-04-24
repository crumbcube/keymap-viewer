// src/types/hid.ts
export interface HIDDevice {
    sendReport: (reportId: number, data: Uint8Array) => Promise<void>;
    oninputreport: ((event: HIDInputReportEvent) => void) | null;
    open: () => Promise<void>;
  }
  
  export interface HIDInputReportEvent {
    data: DataView;
  }
  
  interface HID {
    requestDevice: (options: { filters: any[] }) => Promise<HIDDevice[]>;
    getDevices: () => Promise<HIDDevice[]>;
  }
  
  declare global {
    interface Navigator {
      hid?: HID; // この行はOK
    }
  }
  