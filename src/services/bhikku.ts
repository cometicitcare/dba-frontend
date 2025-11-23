import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageBhikku = (body: any) => BackendClient.post(`${baseURL}/bhikkus/manage`, body);
export const _manageSilmatha = (body: any) => BackendClient.post(`${baseURL}/silmatha-regist/manage`, body);
export const _approveBhikkhu = (br_regn: any) => BackendClient.post(`${baseURL}/bhikkus/${br_regn}/approve`);
export const _rejectBhikkhu = (br_regn: any, body: any) => BackendClient.post(`${baseURL}/bhikkus/${br_regn}/reject`, body);
export const _markPrintedBhikkhu = (br_regn: any) => BackendClient.post(`${baseURL}/bhikkus/${br_regn}/mark-printed`);
export const _uploadScannedDocument = (br_regn: any, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return BackendClient.post(
    `${baseURL}/bhikkus/${br_regn}/upload-scanned-document`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};


// High Bhikkhu
export const _manageHighBhikku = (body: any) => BackendClient.post(`${baseURL}/bhikkus-high/manage`, body);
export const _approveHighBhikkhu = (body: any) => BackendClient.post(`${baseURL}/bhikkus-high/workflow`, body);
export const _rejectHighBhikkhu = (body: any) => BackendClient.post(`${baseURL}/bhikkus-high/workflow`, body);
export const _markPrintedHighBhikkhu = (body: any) => BackendClient.post(`${baseURL}/bhikkus-high/workflow`,body);
export const _uploadScannedHighDocument = (bhr_regn: any, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return BackendClient.post(
    `${baseURL}/bhikkus-high/${bhr_regn}/upload-scanned-document`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};
