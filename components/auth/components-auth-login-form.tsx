'use client';
import React, { useState } from 'react';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import { useRouter } from 'next/navigation';
import { _login } from '@/services/auth';

const ComponentsAuthLoginForm = () => {
    const router = useRouter();

    const [form, setForm] = useState({
        ua_username: '',
        ua_password: '',
    });
    console.log(form)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await _login(form);

            // ✅ Check if the response is valid and has the session_id
            if (response.status === 200 && response.data?.user) {
                console.log('Login success:', response.data);

                // Save session data
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Redirect to home/dashboard
                router.push('/');
            } else {
                // Unexpected response format
                setError('Login failed. Please try again.');
            }
        } catch (err: any) {
            console.error('Login error:', err);

            // Backend returns meaningful detail field
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={submitForm}>
            <div>
                <label htmlFor="ua_username">User Name</label>
                <div className="relative text-white-dark">
                    <input
                        id="ua_username"
                        name="ua_username"
                        type="text"
                        placeholder="User name"
                        value={form.ua_username}
                        onChange={handleChange}
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>

            <div>
                <label htmlFor="ua_password">Password</label>
                <div className="relative text-white-dark">
                    <input
                        id="ua_password"
                        name="ua_password"
                        type="password"
                        placeholder="Enter Password"
                        value={form.ua_password}
                        onChange={handleChange}
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>

            {error && (
                <p className="text-red-500 text-sm font-semibold">{error}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="btn !mt-6 w-full border-0 uppercase text-white shadow-[0_10px_20px_-10px_rgba(255,69,0,0.44)] transition hover:opacity-90"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(255,165,0,1) 0%, rgba(255,69,0,1) 100%)',
                }}
            >
                {loading ? 'Signing in...' : 'Sign in'}
            </button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
