import BackendClient from './backendClient';
import { baseURL } from "../utils/config";

type DuplicateCheckResponse = {
  status: "duplicate_found" | "no_duplicate";
  message: string;
  data: null | {
    found_in: string;
    regn: string;
    gihiname: string;
    date_of_birth: string;
  };
};
export const _manageBhikku = (body: any) => BackendClient.post(`${baseURL}/bhikkus/manage`, body);
export const _checkBhikkhuDuplicate = (gihiname: string, dateOfBirth: string) =>
  BackendClient.post<DuplicateCheckResponse>(
    `${baseURL}/bhikkus/check-duplicate?gihiname=${encodeURIComponent(gihiname)}&date_of_birth=${encodeURIComponent(dateOfBirth)}`
  );
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


export const _uploadDirectScannedHighDocument = (bhr_id: any, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return BackendClient.post(
    `${baseURL}/direct-bhikku-high/${bhr_id}/upload-scanned-document`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};
export const _manageDirectHighBhikku = (body: any) => BackendClient.post(`${baseURL}/direct-bhikku-high/manage`, body);

export const _manageTempBhikku = (body: any) => BackendClient.post(`${baseURL}/temporary-bhikku/manage`, body);
