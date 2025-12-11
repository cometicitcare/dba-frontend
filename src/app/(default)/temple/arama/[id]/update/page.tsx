'use client'
import React, { useEffect, useState } from 'react'
import UpdateArama from './Components/UpdateArama'
import { ADMIN_ROLE_LEVEL, SILMATHA_MANAGEMENT_DEPARTMENT } from '@/utils/config';
import { getStoredUserData, UserData } from '@/utils/userData';
import { useRouter } from 'next/navigation';

const Page = () => {

    const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored || stored.department !== SILMATHA_MANAGEMENT_DEPARTMENT) {
      router.replace("/");
      return;
    }

    setUserData(stored);
  }, [router]);

  const isAdmin = userData?.roleLevel === ADMIN_ROLE_LEVEL;
  return (
    <div><UpdateArama isAdmin={isAdmin}/></div>
  )
}
export default Page

