import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
import axios from 'axios';

export const _manageArama = (body: any) => BackendClient.post(`${baseURL}/arama-data/manage`, body);

export const _uploadScannedDocument = async (arId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const apiBase = baseURL || '';
  
  const response = await axios.post(
    `${apiUrl}${apiBase}/arama-data/${arId}/upload-scanned-document`,
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

export const _aramaManage = (body: any) => BackendClient.post(`${baseURL}/silmatha-regist/arama-list`, body);
