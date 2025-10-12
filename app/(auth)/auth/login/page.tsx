import ComponentsAuthLoginForm from '@/components/auth/components-auth-login-form';
import IconFacebookCircle from '@/components/icon/icon-facebook-circle';
import IconGoogle from '@/components/icon/icon-google';
import IconInstagram from '@/components/icon/icon-instagram';
import IconTwitter from '@/components/icon/icon-twitter';
import LanguageDropdown from '@/components/language-dropdown';
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import { _login } from '@/services/auth';

export const metadata: Metadata = {
    title: 'Login Cover',
};

const Login = () => {

    
    return (
        <div>
            <div className="absolute inset-0">
                
            </div>
            <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/DBAS_BCKG.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
                
                <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                    <div className="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(255,165,0,1)_0%,rgba(255,69,0,1)_100%)] p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                        <p></p>
                    </div>

                    <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                        <div className="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                            <Link href="/" className="block w-8 lg:hidden">
                                <img src="/assets/images/logo.png" alt="Logo" className="mx-auto w-10" />
                            </Link>
                            <LanguageDropdown className="ms-auto w-max" />
                        </div>
                        <div className="w-full max-w-[440px] lg:mt-16">
                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">Sign in</h1>
                                <p className="text-base font-bold leading-normal text-white-dark">Enter your user name and password to login</p>
                            </div>
                            <ComponentsAuthLoginForm />

                            <div className="relative my-7 text-center md:mb-9">
                                <span className="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-white-light dark:bg-white-dark"></span>
                                <span className="relative bg-white px-2 font-bold uppercase text-white-dark dark:bg-dark dark:text-white-light">or</span>
                            </div>
                            <div className="mb-10 md:mb-[60px]">
                                <ul className="flex justify-center gap-3.5 text-white">
                                <li>
                                    <Link
                                    href="#"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,165,0,1) 0%, rgba(255,69,0,1) 100%)',
                                    }}
                                    >
                                    <IconInstagram />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                    href="#"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,165,0,1) 0%, rgba(255,69,0,1) 100%)',
                                    }}
                                    >
                                    <IconFacebookCircle />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                    href="#"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,165,0,1) 0%, rgba(255,69,0,1) 100%)',
                                    }}
                                    >
                                    <IconTwitter fill={true} />
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                    href="#"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,165,0,1) 0%, rgba(255,69,0,1) 100%)',
                                    }}
                                    >
                                    <IconGoogle />
                                    </Link>
                                </li>
                                </ul>

                            </div>
                            <div className="text-center dark:text-white">
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
                        <p className="absolute bottom-6 w-full text-center dark:text-white">© {new Date().getFullYear()}. DBA All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
