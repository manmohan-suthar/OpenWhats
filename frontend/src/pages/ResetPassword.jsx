import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import {
  CheckCircle,
  Eye,
  EyeOff,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { auth } from "../config/firebase";
import { api } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError("Invalid reset link. Please request a new one.");
      setVerifying(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((resolvedEmail) => {
        setEmail(resolvedEmail);
        setVerifying(false);
      })
      .catch(() => {
        setError(
          "This reset link is invalid or has expired. Please request a new one.",
        );
        setVerifying(false);
      });
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);

      // Sync the new password hash to MongoDB so local login still works
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          newPassword,
        );
        const idToken = await credential.user.getIdToken();
        await api.updatePassword(idToken, newPassword);
      } catch {
        // Firebase password is reset successfully; MongoDB sync is best-effort
      }

      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      if (
        err.code === "auth/invalid-action-code" ||
        err.code === "auth/expired-action-code"
      ) {
        setError(
          "This reset link has expired or already been used. Please request a new one.",
        );
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-wa-green flex items-center justify-center">
            <MessageCircle size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg">
            WA Control
          </span>
        </div>

        {verifying ? (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Verifying reset link…
            </div>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Password reset!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Your password has been updated. Redirecting to sign in…
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary w-full"
            >
              Go to sign in
            </button>
          </div>
        ) : error && !email ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} className="text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Invalid link
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary w-full"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Set new password
              </h1>
              {email && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Resetting password for{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {email}
                  </span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm new password
                </label>
                <input
                  type={showPwd ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full btn-lg mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Resetting password…
                  </span>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
              <button
                onClick={() => navigate("/login")}
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Back to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
