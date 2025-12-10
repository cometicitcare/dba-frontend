export interface UserRole {
  ro_role_id: string;
  ro_role_name: string;
  ro_level?: string | null;
  department?: string | null;
}

export interface UserData {
  ua_user_id: string;
  ua_username: string;
  ua_email: string;
  ua_first_name: string;
  ua_last_name: string;
  ua_phone?: string | null;
  ua_status: string;
  ro_role_id?: string | null;
  role_ids?: string[];
  role?: {
    ro_role_id: string;
    ro_role_name: string;
    ro_description?: string;
  } | null;
  departments?: string[];
  roles?: UserRole[];
  department?: string;
  roleLevel?: string | null;
}

export function getStoredUserData(): UserData | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("user");
  console.log("stored", stored);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;

    const root = parsed as Record<string, any>;
    const userPayload = "user" in root && typeof root.user === "object" ? root.user : root;
    if (!userPayload || typeof userPayload !== "object") return null;

    const rootDepartments = Array.isArray(root.departments) ? root.departments : undefined;
    const payloadDepartments = Array.isArray(userPayload.departments) ? userPayload.departments : undefined;
    const departmentValue = rootDepartments?.[0] ?? payloadDepartments?.[0];

    const rootRoles = Array.isArray(root.roles) ? root.roles : undefined;
    const payloadRoles = Array.isArray(userPayload.roles) ? userPayload.roles : undefined;
    const roleLevelValue = (rootRoles ?? payloadRoles)?.[0]?.ro_level;

    const normalized: UserData = {
      ...(userPayload as UserData),
      departments: rootDepartments ?? payloadDepartments,
      roles: rootRoles ?? payloadRoles,
      department: departmentValue,
      roleLevel: roleLevelValue,
    };
    console.log("normalized", normalized);
    return normalized;
  } catch (err) {
    console.error("Invalid user data in localStorage", err);
    return null;
  }
}
