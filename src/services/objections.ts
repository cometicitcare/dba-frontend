import BackendClient from "./backendClient";
import { baseURL } from "../utils/config";

export type ManageObjectionsResponse = {
  status?: "success" | "error" | string;
  message?: string;
  data?: unknown;
  totalRecords?: number;
};

export const _ManageObjections = (body: unknown) =>
  BackendClient.post<ManageObjectionsResponse>(`${baseURL}/objections/manage`, body);
