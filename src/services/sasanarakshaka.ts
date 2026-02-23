import BackendClient from "./backendClient";
import { baseURL } from "../utils/config";

export type SasanarakshakaListParams = {
  page?: number;
  limit?: number;
  search_key?: string;
  sr_dvcd?: string;
};

export type SasanarakshakaListResponse<T = unknown> = {
  status?: string;
  message?: string;
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  success?: boolean;
  errors?: Array<{ field?: string | null; message?: string }>;
};

export const _getSasanarakshakaList = (
  params: SasanarakshakaListParams,
  token?: string | null
) =>
  BackendClient.get<SasanarakshakaListResponse>(`${baseURL}/sasanarakshaka`, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    skipAuthRedirect: true,
  });
