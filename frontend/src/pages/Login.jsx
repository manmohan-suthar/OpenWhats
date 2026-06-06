import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  MessageCircle,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";
import { auth, googleProvider } from "../config/firebase";

const features = [
  {
    icon: Zap,
    title: "Instant Sessions",
    desc: "Connect WhatsApp sessions in seconds",
  },
  {
    icon: Globe,
    title: "API-First",
    desc: "Powerful REST APIs for automation",
  },
  {
    icon: Shield,
    title: "Enterprise-grade",
    desc: "SOC2 compliant, end-to-end encrypted",
  },
];

export default function Login() {
  const [tab, setTab] = useState("login"); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (tab === "login") {
        // Call real login API
        const result = await api.login(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          login(result.user, result.token);
          navigate(result.user?.role === "admin" ? "/admin" : "/dashboard");
        }
      } else if (tab === "register") {
        // Register in Firebase first so we can send and enforce email verification.
        const firebaseCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await sendEmailVerification(firebaseCredential.user, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });

        const result = await api.register(email, password, name, {
          firebaseUid: firebaseCredential.user.uid,
        });

        if (result.error) {
          setError(result.error);
        } else {
          await signOut(auth);
          setTab("login");
          setPassword("");
          setSuccess(
            "Verification email sent. Please verify your email, then sign in.",
          );
        }
      } else if (tab === "forgot") {
        await sendPasswordResetEmail(auth, email, {
          url: window.location.origin + "/reset-password",
          handleCodeInApp: false,
        });
        setSuccess(
          "Password reset email sent! Check your inbox and click the link to reset your password.",
        );
        setTab("login");
        setEmail("");
      }
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();
      const result = await api.googleLogin(idToken);

      if (result.error) {
        setError(result.error);
        return;
      }

      login(result.user, result.token);
      navigate(result.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else if (err?.code === "auth/configuration-not-found") {
        setError(
          "Google Login is not enabled in your Firebase project. In Firebase Console, enable Authentication -> Sign-in method -> Google, then retry.",
        );
      } else if (err?.code === "auth/invalid-api-key") {
        setError(
          "Invalid Firebase API key. Please verify frontend Firebase config.",
        );
      } else if (err?.code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized in Firebase Auth. Add it in Authentication -> Settings -> Authorized domains.",
        );
      } else {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[480px] flex-shrink-0 flex-col bg-gradient-to-br from-wa-dark via-wa-teal to-primary-600 relative overflow-hidden p-10">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-40 -right-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-20 -left-12 w-36 h-36 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">
              WA Control
            </p>
            <p className="text-white/60 text-xs">Session Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="flex-1 flex flex-col justify-center relative">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            The WhatsApp <br />
            <span className="text-white/80">management</span> <br />
            platform.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Connect, manage, and automate your WhatsApp sessions with
            enterprise-grade reliability and developer-friendly APIs.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/60">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/40 text-xs relative">
          © 2026 WA Control. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-2 lg:hidden">
            <MessageCircle size={18} className="text-wa-green" />
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              WA Control
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <span className="inline-flex items-center gap-1.5">
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                {theme === "dark" ? "Light" : "Dark"}
              </span>
            </button>
            {tab === "login" ? (
              <button
                onClick={() => setTab("register")}
                className="btn-secondary btn-sm"
              >
                Create account
              </button>
            ) : (
              <button
                onClick={() => setTab("login")}
                className="btn-secondary btn-sm"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {tab === "login"
                  ? "Welcome back"
                  : tab === "register"
                  ? "Create your account"
                  : "Reset your password"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {tab === "login"
                  ? "Sign in to your WA Control dashboard"
                  : tab === "register"
                  ? "Start your free trial — no credit card required"
                  : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Suthar Tech"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {tab !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    {tab === "login" && (
                      <button
                        type="button"
                        onClick={() => { setError(""); setSuccess(""); setTab("forgot"); }}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      className="input pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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
              )}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {success && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full btn-lg mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    {tab === "login"
                      ? "Signing in…"
                      : tab === "register"
                      ? "Creating account…"
                      : "Sending reset link…"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {tab === "login"
                      ? "Sign in"
                      : tab === "register"
                      ? "Create account"
                      : "Send reset link"}
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>

            {tab === "login" && (
              <div className="mt-4">
                <div className="relative flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-xs text-slate-400">
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="btn-secondary w-full gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {googleLoading
                    ? "Signing in with Google..."
                    : "Continue with Google"}
                </button>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
              {tab === "login"
                ? "Don't have an account? "
                : tab === "register"
                ? "Already have an account? "
                : "Remember your password? "}
              <button
                onClick={() => setTab(tab === "login" ? "register" : "login")}
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                {tab === "login" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
