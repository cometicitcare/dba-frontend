// src/config/roles.ts

export interface Role {
  id: string;
  name: string;
  description: string;
}

// Define all roles centrally
export const ROLES: Record<string, Role> = {
  ADMIN: {
    id: "ROLE00001",
    name: "Admin",
    description: "Full access to all features",
  },
  SUPERVISOR: {
    id: "ROLE00002",
    name: "Supervisor",
    description: "Manage data and supervise operations",
  },
  DATA_ENTRY: {
    id: "ROLE00003",
    name: "Data Entry Clerk",
    description: "Data entry and basic operations",
  },
};

// Utility functions
export const getRoleById = (id: string): Role | undefined =>
  Object.values(ROLES).find((r) => r.id === id);

export const getRoleNameById = (id: string): string =>
  getRoleById(id)?.name || "Unknown Role";
