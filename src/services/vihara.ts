import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
import axios from 'axios';

export const _manageVihara = (body: any) => BackendClient.post(`${baseURL}/vihara-data/manage`, body);
export const _markPrintedVihara = (vh_id: number) => {
  return BackendClient.post(`${baseURL}/vihara-data/manage`, {
    action: "MARK_PRINTED",
    payload: {
      vh_id,
    },
  });
};

export const _uploadScannedDocument = async (vhId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const apiBase = baseURL || '';
  
  const response = await axios.post(
    `${apiUrl}${apiBase}/vihara-data/${vhId}/upload-scanned-document`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    }
  );
  
  return response.data;
};

export const _uploadStageDocument = async (vhId: number, file: File, stage: 1 | 2) => {
  const formData = new FormData();
  formData.append('file', file);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const apiBase = baseURL || '';
  const endpoint =
    stage === 1
      ? `${apiUrl}${apiBase}/vihara-data/${vhId}/upload-stage1-document`
      : `${apiUrl}${apiBase}/vihara-data/${vhId}/upload-stage2-document`;

  const response = await axios.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    withCredentials: true,
  });

  return response.data;
};

export const _approveStage = async (vhId: number, stage: 1 | 2) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const apiBase = baseURL || '';
  const endpoint =
    stage === 1
      ? `${apiUrl}${apiBase}/vihara-data/${vhId}/approve-stage1`
      : `${apiUrl}${apiBase}/vihara-data/${vhId}/approve-stage2`;
  const response = await axios.post(endpoint, undefined, { withCredentials: true });
  return response.data;
};

export const _rejectStage = async (vhId: number, stage: 1 | 2, reason: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const apiBase = baseURL || '';
  const endpoint =
    stage === 1
      ? `${apiUrl}${apiBase}/vihara-data/${vhId}/reject-stage1`
      : `${apiUrl}${apiBase}/vihara-data/${vhId}/reject-stage2`;

  const response = await axios.post(`${endpoint}?rejection_reason=${encodeURIComponent(reason)}`, undefined, {
    withCredentials: true,
  });
  return response.data;
};
