import BackendClient from './backendClient';
import { baseURL } from "../utils/config";
import axios from 'axios';

export const _manageVihara = (body: any) => BackendClient.post(`${baseURL}/vihara-data/manage`, body);

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
