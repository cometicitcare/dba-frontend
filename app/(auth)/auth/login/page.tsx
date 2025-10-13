'use client';

import ComponentsAuthLoginForm from '@/components/auth/components-auth-login-form';
import LanguageDropdown from '@/components/language-dropdown';
import Link from 'next/link';
import React from 'react';

const LoginClient = () => {
    return (
        <div>
            <div className="absolute inset-0"></div>
            <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/DBAS_BCKG.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
                <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                    
                    <div className="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(255,165,0,1)_0%,rgba(255,69,0,1)_100%)] p-10 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                        <div className="xl:skew-x-[-14deg] rtl:xl:skew-x-[14deg] text-center max-w-[500px]">
                            {/* add the logo */}
                            <div className="flex justify-center mb-6">
                                <img
                                    src="/assets/images/BD-Logo-BL.png"
                                    alt="Department of Buddhist Affairs Logo"
                                    className="w-[350px] h-auto"
                                />
                            </div>
                            <h1 className="text-4xl font-extrabold text-white mb-6 leading-snug" >
                                Department of Buddhist Affairs - HRMS 
                            </h1>
                            <p className="text-lg text-white/90 leading-relaxed" style={{padding:'50px'}}>
                                Supporting the guardians of our living Buddhist heritage. Efficiently managing the resources and personnel who preserve the Dhamma and serve our nation's spiritual foundation.
                            </p>
                        </div>
                    </div>

                    <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                        <div className="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                            <Link href="/" className="block lg:hidden">
                                <img src="/assets/images/BD-Logo-BL.png" alt="Logo" className="w-[350px] h-auto" />
                            </Link>
                            {/* <LanguageDropdown className="ms-auto w-max" /> */}
                        </div>
                        <div className="w-full max-w-[440px] lg:mt-16">
                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">
                                    Sign in
                                </h1>
                                <p className="text-base font-bold leading-normal text-white-dark">
                                    Enter your user name and password to login
                                </p>
                            </div>
                            <ComponentsAuthLoginForm />

                            

                            <div className="text-center dark:text-white" style={{marginTop:'20px'}}>
                                Don&apos;t have an account?&nbsp;
                                <Link
                                    href="/auth/cover-register"
                                    className="uppercase underline transition hover:text-black dark:hover:text-white"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,165,0,1) 0%, rgba(255,69,0,1) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        display: 'inline-block',
                                    }}
                                >
                                    SIGN UP
                                </Link>
                            </div>
                        </div>
                        <p className="absolute bottom-6 w-full text-center dark:text-white">
                            © {new Date().getFullYear()}. Department of Buddhist Affairs - HRMS All Rights Reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginClient;
