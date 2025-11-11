// app/(auth)/login/page.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserIcon, LockIcon, AlertCircle } from "lucide-react";
import { _login } from "@/services/auth"; // integrates old API

/** Why: the old API typing is loose; we locally narrow for safety without changing the service. */
type User = Record<string, unknown>;
type LoginSuccess = { status: number; data: { user: User } };
type LoginErrorShape = { response?: { data?: { detail?: string } } };

/** Why: precise runtime check that also narrows TypeScript type. */
function hasUser(resp: unknown): resp is LoginSuccess {
  return (
    typeof resp === "object" &&
    resp !== null &&
    // @ts-expect-error: runtime checks before narrowing
    typeof resp.status === "number" &&
    // @ts-expect-error: runtime checks before narrowing
    resp.status === 200 &&
    // @ts-expect-error: runtime checks before narrowing
    typeof resp.data === "object" &&
    // @ts-expect-error: runtime checks before narrowing
    resp.data !== null &&
    // @ts-expect-error: runtime checks before narrowing
    "user" in resp.data
  );
}

export default function Login() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // NOTE: kept invisible to preserve UI; used for control/logging only.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent double submit

    // Why: show an in-page, brand-colored error instead of alert()
    if (!username || !password) {
      setError("User name and password are required.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      // Map new UI fields to old API payload shape.
      const resp = await _login({
        ua_username: username,
        ua_password: password,
      });

      if (hasUser(resp)) {
        // Why: keep session contract consistent with old UI.
        localStorage.setItem("user", JSON.stringify(resp.data.user));
        router.push("/"); // redirect to home/dashboard, same as old UI
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      const detail =
        (err as LoginErrorShape)?.response?.data?.detail ||
        "Credentials are incorrect. Please try again.";
      setError(detail); // Why: surface server-provided detail where available
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute top-0 left-0 w-96 h-96" viewBox="0 0 200 200">
            <path d="M100,20 Q120,40 140,60 Q160,80 180,100 Q160,120 140,140 Q120,160 100,180 Q80,160 60,140 Q40,120 20,100 Q40,80 60,60 Q80,40 100,20" fill="currentColor" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-96 h-96" viewBox="0 0 200 200">
            <path d="M100,20 Q120,40 140,60 Q160,80 180,100 Q160,120 140,140 Q120,160 100,180 Q80,160 60,140 Q40,120 20,100 Q40,80 60,60 Q80,40 100,20" fill="currentColor" />
          </svg>
        </div>
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <img src="/BD-Logo.png" alt="Department Logo" />
          </div>
          <h1 className="text-4xl font-bold mb-6">Department of Buddhist Affairs - HRMS</h1>
          <p className="text-lg text-white/90">
            Supporting the guardians of our living Buddhist heritage. Efficiently managing the resources and personnel who preserve the Dhamma.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-blue-600 mb-2">SIGN IN</h2>
            <p className="text-gray-500 mb-6">Enter your user name and password to login</p>

            {/* Brand-colored inline error */}
            {error && (
              <div className="mb-6" role="alert" aria-live="assertive">
                <div className="flex items-start gap-3 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 text-orange-800">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-semibold">Login failed</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="ml-2 text-sm underline decoration-dotted hover:opacity-80"
                    aria-label="Dismiss error"
                    title="Dismiss"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">User Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="User name"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
                // NOTE: Do not disable or change text to preserve exact UI.
                onClick={() => void 0}
              >
                SIGN IN
              </button>
            </form>
            <p className="text-center text-sm text-gray-600 mt-6">
              Don&apos;t have an account?{" "}
              <a href="#" className="text-orange-500 hover:text-orange-600 font-semibold">SIGN UP</a>
            </p>
          </div>
          <p className="text-center text-xs text-gray-500 mt-8">© 2025. Department of Buddhist Affairs - HRMS All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}
