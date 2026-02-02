'use client'
import React, { useEffect, useState } from 'react'
import UpdateVihara from './Components/UpdateVihara'
import { getStoredUserData, UserData } from '@/utils/userData';
import { DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT, VIHARA_MANAGEMENT_DEPARTMENT } from '@/utils/config';
import { useRouter } from 'next/navigation'

const Page = () => {
  const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
  
    useEffect(() => {
      const stored = getStoredUserData();
      const allowedDepartments = [VIHARA_MANAGEMENT_DEPARTMENT, DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT];
      if (!stored || !allowedDepartments.includes(stored.department || "")) {
        router.replace('/');
        return;
      }
  
      setUserData(stored);
    }, []);

    const roleLevel = userData?.roleLevel || '';
    const department = userData?.department;

  return (
    <div><UpdateVihara role={roleLevel} department={department} /></div>
  )
}
export default Page

