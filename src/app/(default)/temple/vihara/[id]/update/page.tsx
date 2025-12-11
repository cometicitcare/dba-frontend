'use client'
import React, { useEffect, useState } from 'react'
import UpdateVihara from './Components/UpdateVihara'
import { getStoredUserData, UserData } from '@/utils/userData';
import { VIHARA_MANAGEMENT_DEPARTMENT } from '@/utils/config';
import { useRouter } from 'next/navigation'

const Page = () => {
  const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
  
    useEffect(() => {
      const stored = getStoredUserData();
      if (!stored || stored.department !== VIHARA_MANAGEMENT_DEPARTMENT) {
        router.replace('/');
        return;
      }
  
      setUserData(stored);
    }, []);

    const roleLevel = userData?.roleLevel || '';

  return (
    <div><UpdateVihara role={roleLevel} /></div>
  )
}
export default Page

