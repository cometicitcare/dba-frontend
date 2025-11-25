import BackendClient from "./backendClient";
import { baseURL } from "../utils/config";

export type ReprintResponse<T = unknown> = {
  status?: string;
  message?: string;
  data?: T;
  success?: boolean;
  errors?: Array<{ message?: string | undefined }>;
  totalRecords?: number;
};

export const _searchId = <T = unknown>(body: any) =>
  BackendClient.post<ReprintResponse<T>>(`${baseURL}/reprint`, body);

export const _getReprintUrl = <T = unknown>(body: any) =>
  BackendClient.post<ReprintResponse<T>>(`${baseURL}/reprint/reprint_url`, body);
