"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { _forgotPassword, _resetPassword } from "@/services/auth";

type ChannelMeta = {
  email?: boolean;
  sms?: boolean;
};

type MaskedMeta = {
  email?: string;
  phone?: string;
};

type ForgetResponse = {
  success?: boolean;
  message?: string;
  user_id?: string;
  channels?: ChannelMeta;
  masked?: MaskedMeta;
};

type ResetResponse = {
  success?: boolean;
  message?: string;
};

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"identify" | "verify" | "success">("identify");
  const [identifier, setIdentifier] = useState("");
  const [identifierMessage, setIdentifierMessage] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelMeta>({});
  const [masked, setMasked] = useState<MaskedMeta>({});
  const [userId, setUserId] = useState<string>("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmitIdentifier = identifier.trim().length > 0;
  const canSubmitReset =
    Boolean(userId) && otp.trim().length > 0 && newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const channelSummary = useMemo(() => {
    const info: string[] = [];
    if (channels.email && masked.email) info.push(`Email (${masked.email})`);
    if (channels.sms && masked.phone) info.push(`SMS (${masked.phone})`);
    return info.join(" or ");
  }, [channels, masked]);

  const handleIdentifierSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitIdentifier) return;
    setError(null);
    setIdentifierMessage(null);
    setLoading(true);
    try {
      const res = await _forgotPassword({ identifier: identifier.trim() });
      const data: ForgetResponse = res?.data ?? {};
      if (!data?.success) throw new Error(data?.message ?? "Unable to send OTP.");
      setIdentifierMessage(data.message ?? null);
      setChannels(data.channels ?? {});
      setMasked(data.masked ?? {});
      setUserId(data.user_id ?? "");
      setStep("verify");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitReset) return;
    setError(null);
    setResetMessage(null);
    setLoading(true);
    try {
      const res = await _resetPassword({
        user_id: userId,
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      const data: ResetResponse = res?.data ?? {};
      if (!data?.success) throw new Error(data?.message ?? "Unable to reset password.");
      setResetMessage(data.message ?? "Password reset successful.");
      setStep("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const identifierView = (
    <form onSubmit={handleIdentifierSubmit} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
          Username or Email
        </label>
        <input
          id="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Enter your username or email"
          required
        />
      </div>
      {identifierMessage && <p className="text-sm text-green-600">{identifierMessage}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!canSubmitIdentifier || loading}
        className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send OTP"}
      </button>
    </form>
  );

  const verifyView = (
    <form onSubmit={handleResetSubmit} className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">We sent you an OTP</p>
        <p>{identifierMessage}</p>
        {channelSummary && <p className="mt-2">Check: {channelSummary}</p>}
      </div>
      <div>
        <label htmlFor="otp" className="text-sm font-medium text-slate-700">
          One-Time Password
        </label>
        <input
          id="otp"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Enter the 6-digit OTP"
          required
        />
      </div>
      <div>
        <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
          New Password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Enter new password"
          required
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Re-enter new password"
          required
        />
        {newPassword && confirmPassword && newPassword !== confirmPassword ? (
          <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
        ) : null}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!canSubmitReset || loading}
        className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );

  const successView = (
    <div className="space-y-4 text-center">
      <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
        <p className="font-semibold text-green-900">Password Reset Successful</p>
        <p>{resetMessage ?? "You can now log in with your new password."}</p>
      </div>
      <Link
        href="/login"
        className="inline-flex w-full justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-white transition hover:bg-orange-700"
      >
        Go to Login
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-4 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="hidden rounded-3xl border border-white/30 bg-white/10 p-10 text-white shadow-2xl backdrop-blur-md lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <img src="/BD-Logo.png" alt="Department Logo" className="h-12 w-12 rounded-full border border-white/40 bg-white/20 p-2" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/70">Department of Buddhist Affairs</p>
                <p className="text-lg font-semibold text-white/90">Human Resource Management System</p>
              </div>
            </div>
            <h1 className="text-4xl font-bold leading-snug">
              Let’s get you back <span className="text-yellow-200">into the system.</span>
            </h1>
            <p className="mt-4 text-base text-white/80">
              Provide your username or email and we’ll guide you through a secure password reset flow. Check the OTP sent to your registered channels.
            </p>
          </div>
          <div className="space-y-3 text-white/80">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-semibold">01</span>
              <div>
                <p className="font-semibold text-white">Verify identity</p>
                <p className="text-sm text-white/70">Enter your username or email and receive OTP.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-semibold">02</span>
              <div>
                <p className="font-semibold text-white">Reset password</p>
                <p className="text-sm text-white/70">Submit OTP with your new secure password.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-semibold">03</span>
              <div>
                <p className="font-semibold text-white">Access restored</p>
                <p className="text-sm text-white/70">Return to the HRMS dashboard with renewed access.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/40 bg-white/95 p-8 shadow-2xl backdrop-blur-lg">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-semibold text-slate-900">Forgot Password</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your username or email to receive a one-time password. Then create a new password to regain access.
            </p>
          </div>

          {step === "identify" && identifierView}
          {step === "verify" && verifyView}
          {step === "success" && successView}

          <div className="mt-6 text-center text-sm text-slate-600">
            <span>Remembered your password?</span>{" "}
            <Link href="/login" className="font-semibold text-orange-600 hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
