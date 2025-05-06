import { ReportCallback, onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'; // ReportCallback と各関数をインポート

const reportWebVitals = (onPerfEntry?: ReportCallback) => { // ReportHandler -> ReportCallback
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Call individual functions directly
   onCLS(onPerfEntry);
   onFID(onPerfEntry);
   onFCP(onPerfEntry);
   onLCP(onPerfEntry);
   onTTFB(onPerfEntry);
 }
};

export default reportWebVitals;
