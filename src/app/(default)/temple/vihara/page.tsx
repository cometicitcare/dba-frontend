'use client'

import React, { useEffect, useState } from 'react'
import ViharaList from './Components/ViharaList'
import { getStoredUserData, UserData } from '@/utils/userData';
import { ADMIN_ROLE_LEVEL, VIHARA_MANAGEMENT_DEPARTMENT } from '@/utils/config';
import { useRouter } from 'next/navigation'

const Page = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored || stored.department !== VIHARA_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true);
      router.replace('/');
      return;
    }

    setUserData(stored);
    setAccessChecked(true);
  }, [router]);

  const canDelete = userData?.roleLevel === ADMIN_ROLE_LEVEL;

  return (
    <ViharaList canDelete={canDelete} />
  );
};

export default Page;
