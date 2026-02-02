'use client'

import React, { useEffect, useState } from 'react'
import ViharaList from './Components/ViharaList'
import { getStoredUserData, UserData } from '@/utils/userData';
import { ADMIN_ROLE_LEVEL, DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT, VIHARA_MANAGEMENT_DEPARTMENT } from '@/utils/config';
import { useRouter } from 'next/navigation'

const Page = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const stored = getStoredUserData();
    const allowedDepartments = [VIHARA_MANAGEMENT_DEPARTMENT, DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT];
    if (!stored || !allowedDepartments.includes(stored.department || "")) {
      setAccessDenied(true);
      router.replace('/');
      return;
    }

    setUserData(stored);
    setAccessChecked(true);
  }, [router]);

  const canDelete = userData?.roleLevel === ADMIN_ROLE_LEVEL && userData.department !== DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT;

  return (
    <ViharaList canDelete={canDelete} />
  );
};

export default Page;
