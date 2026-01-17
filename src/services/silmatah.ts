import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
export const _manageSilmatha = (body: any) => BackendClient.post(`${baseURL}/silmatha-regist/manage`, body);
export const _manageTempSilmatha = (body: any) => BackendClient.post(`${baseURL}/temporary-silmatha/manage`, body);
export const _rejectSilmatha = (body: any) => BackendClient.post(`${baseURL}/silmatha-regist/workflow`, body);
export const _approveSilmatha = (sil_regn: any) => BackendClient.post(`${baseURL}/silmatha-regist/${sil_regn}/approve`);
export const _markPrintedSilmatha = (sil_regn: any) => BackendClient.post(`${baseURL}/silmatha-regist/${sil_regn}/mark-printed`);
export const _uploadScannedDocument = (sil_regn: any, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return BackendClient.post(
    `${baseURL}/silmatha-regist/${sil_regn}/upload-scanned-document`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};
