import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Star,
  ArrowRight,
  Globe,
  MapPin,
  ShieldCheck,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { authFetch } from "../../services/authFetch";

export default function GoogleReviewConnect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState("welcome"); // welcome, connecting, success, no-business, unverified-testing, error
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [acceptingUnverified, setAcceptingUnverified] = useState(false);
  const [connectedBusiness, setConnectedBusiness] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  const loadConnection = async () => {
    try {
      const res = await authFetch("/api/google-review/oauth/status");

      if (res?.success && res?.data?.connected) {
        setConnectedBusiness(res.data.connection || null);
        setBusinessProfile(res.data.businessProfile || null);

        if (res.data.businessProfile?.hasVerifiedLocation) {
          setStep("success");
        } else if (res.data.businessProfile?.hasUnverifiedProfile) {
          setStep("unverified-testing");
        } else {
          setStep("no-business");
        }
      } else {
        setStep("welcome");
      }
    } catch (err) {
      console.error("Failed to read Google connection:", err);
      setStep("welcome");
    } finally {
      setCheckingConnection(false);
    }
  };

  useEffect(() => {
    const oauthState = searchParams.get("oauth");
    if (oauthState === "error") {
      setError(searchParams.get("message") || "Google connection failed");
      setStep("error");
      setCheckingConnection(false);
      return;
    }

    loadConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setStep("connecting");

    try {
      const res = await authFetch("/api/google-review/oauth/start", {
        method: "POST",
        body: {},
      });

      if (!res?.success) {
        throw new Error(res?.error || "Failed to start Google OAuth");
      }

      if (!res.authUrl) {
        throw new Error("Google OAuth URL missing from server response");
      }

      window.location.assign(res.authUrl);
    } catch (err) {
      console.error("OAuth error:", err);
      setError(
        err.message.includes("429")
          ? "Too many login attempts detected. Please wait a minute and try again."
          : err.message.includes("401") ||
              err.message.toLowerCase().includes("unauthorized")
            ? "Aapka app login expired ho gaya hai. Please app me dubara sign in karein."
            : err.message,
      );
      setStep("error");
      setLoading(false);
    }
  };

  const handleLogoutGoogleProfile = async () => {
    setDisconnecting(true);
    setError(null);

    try {
      const res = await authFetch("/api/google-review/oauth/disconnect", {
        method: "POST",
        body: {},
      });

      if (!res?.success) {
        throw new Error(res?.error || "Failed to disconnect Google profile");
      }

      setConnectedBusiness(null);
      setBusinessProfile(null);
      setStep("welcome");
    } catch (err) {
      console.error("Disconnect error:", err);
      setError(err.message || "Failed to disconnect Google profile");
      setStep("error");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleAcceptUnverifiedProfile = async () => {
    setAcceptingUnverified(true);
    setError(null);

    try {
      const res = await authFetch(
        "/api/google-review/oauth/accept-unverified",
        {
          method: "POST",
          body: {},
        },
      );

      if (!res?.success) {
        throw new Error(
          res?.error || "Failed to accept unverified profile for testing",
        );
      }

      // Session created, now show success state
      setStep("success");
    } catch (err) {
      console.error("Accept unverified error:", err);
      setError(err.message || "Failed to accept unverified profile");
    } finally {
      setAcceptingUnverified(false);
    }
  };

  if (checkingConnection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-6 py-8 shadow-lg text-center max-w-sm w-full mx-4">
          <Loader2
            className="animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4"
            size={32}
          />
          <p className="font-semibold text-slate-900 dark:text-white">
            Checking Google connection...
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Restoring your saved session securely
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
      <PageHeader
        title="Connect Your Map"
        subtitle="Securely connect Google once and keep the token saved in the backend"
        icon={Star}
        accent="#4285F4"
        tint="rgba(66,133,244,0.08)"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {step === "welcome" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Connect once. Stay signed in.
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  We save your Google token securely in the backend so your team
                  does not have to log in every time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: MapPin,
                    title: "Map Connect",
                    desc: "Link your business profile and keep it ready.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Saved Securely",
                    desc: "OAuth tokens are stored safely on the server.",
                  },
                  {
                    icon: RefreshCw,
                    title: "Auto Refresh",
                    desc: "Reuses refresh tokens when access expires.",
                  },
                  {
                    icon: Globe,
                    title: "No Re-login",
                    desc: "Open the panel without signing in again.",
                  },
                ].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex-shrink-0">
                        <Icon
                          className="text-blue-600 dark:text-blue-400"
                          size={20}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {feature.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-fit">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center w-14 h-14 mx-auto bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 rounded-2xl mb-4">
                    <MapPin
                      className="text-blue-600 dark:text-blue-400"
                      size={26}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Connect your business profile
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Open Google OAuth and save the token in the backend.
                  </p>
                </div>

                <button
                  onClick={handleGoogleOAuth}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Globe size={18} />
                  {loading
                    ? "Opening Google..."
                    : "Connect Your Map with Google"}
                </button>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 text-center leading-5">
                    ✓ OAuth 2.0 with backend token storage
                    <br />
                    ✓ Auto refresh for expired sessions
                    <br />✓ No repeated login prompts
                  </p>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
                  By connecting, you agree to our{" "}
                  <a
                    href="#"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Terms of Service
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 shadow-lg text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 rounded-xl mb-6">
                <Loader2
                  className="animate-spin text-blue-600 dark:text-blue-400"
                  size={32}
                />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Opening Google OAuth...
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                We are securely connecting your business profile.
              </p>
            </div>
          </div>
        )}

        {step === "success" && connectedBusiness && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8 text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-emerald-700 rounded-full mb-4">
                  <CheckCircle className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Google connected successfully
                </h2>
                <p className="text-emerald-100">
                  Your session has been saved in the backend.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
                      {connectedBusiness.picture ? (
                        <img
                          src={connectedBusiness.picture}
                          alt={
                            connectedBusiness.name ||
                            connectedBusiness.email ||
                            "Google Account"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Globe
                          className="text-blue-600 dark:text-blue-400"
                          size={24}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase mb-1 tracking-wider">
                        Connected account
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {connectedBusiness.name ||
                          connectedBusiness.email ||
                          "Google account"}
                      </p>
                      {connectedBusiness.email && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {connectedBusiness.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {businessProfile?.hasVerifiedLocation && (
                    <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                        Verified Business Profile
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {businessProfile.selectedLocation?.title ||
                          "Business location"}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {businessProfile.message}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Session
                      </p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        Saved
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Expiry
                      </p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {connectedBusiness.expiresAt
                          ? new Date(
                              connectedBusiness.expiresAt,
                            ).toLocaleDateString()
                          : "Managed"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Secure
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      OAuth 2.0
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Auto Refresh
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Enabled
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Login
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Remembered
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/google-review")}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Open Dashboard
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={handleLogoutGoogleProfile}
                  disabled={disconnecting}
                  className="w-full py-3 px-4 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LogOut size={18} />
                  {disconnecting ? "Logging out..." : "Logout Google Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "no-business" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-amber-700 rounded-full mb-4">
                  <AlertCircle className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {businessProfile?.rateLimited
                    ? "Google Business API Rate Limited"
                    : "No Google Business Profile found"}
                </h2>
                <p className="text-amber-100">
                  {businessProfile?.message ||
                    "Aapke Google account se koi business profile connected nahi mila."}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    What to do next
                  </p>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {businessProfile?.rateLimited ? (
                      <>
                        <p>• Wait a few minutes and try again later.</p>
                        <p>• Google has temporarily limited API requests.</p>
                        <p>• The system will automatically retry.</p>
                      </>
                    ) : (
                      <>
                        <p>
                          • Open Google Business Profile and create or claim
                          your location.
                        </p>
                        <p>
                          • Verify the profile so reviews can be managed later.
                        </p>
                        <p>• Come back here and reconnect if needed.</p>
                      </>
                    )}
                  </div>
                </div>

                {businessProfile?.hasBusinessProfile &&
                  !businessProfile.hasVerifiedLocation && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Business found, but not verified yet.
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Reviews and replies need a verified location.
                      </p>
                    </div>
                  )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {businessProfile?.rateLimited ? (
                    <>
                      <button
                        onClick={() => window.location.reload()}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:shadow-lg transition-all"
                      >
                        <RefreshCw size={18} />
                        Retry Now
                      </button>
                      <button
                        onClick={handleGoogleOAuth}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      >
                        Try Different Account
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href="https://www.google.com/business/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:shadow-lg transition-all"
                      >
                        Create Business Profile
                        <ArrowRight size={18} />
                      </a>
                      <button
                        onClick={handleGoogleOAuth}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      >
                        Recheck Account
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={handleLogoutGoogleProfile}
                  disabled={disconnecting}
                  className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LogOut size={18} />
                  {disconnecting ? "Logging out..." : "Logout Google Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "unverified-testing" && connectedBusiness && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-8 text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-purple-700 rounded-full mb-4">
                  <RefreshCw className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Unverified Profile Found
                </h2>
                <p className="text-purple-100">
                  Your business profile is not verified yet, but you can use it
                  for testing
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
                      {connectedBusiness.picture ? (
                        <img
                          src={connectedBusiness.picture}
                          alt={
                            connectedBusiness.name ||
                            connectedBusiness.email ||
                            "Google Account"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Globe
                          className="text-blue-600 dark:text-blue-400"
                          size={24}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase mb-1 tracking-wider">
                        Connected account
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {connectedBusiness.name ||
                          connectedBusiness.email ||
                          "Google account"}
                      </p>
                      {connectedBusiness.email && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {connectedBusiness.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {businessProfile?.selectedLocation && (
                    <div className="mt-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-1">
                        Unverified Location (Testing)
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {businessProfile.selectedLocation?.title ||
                          "Business location"}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {businessProfile.message}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    To use this profile for production:
                  </p>
                  <div className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
                    <p>
                      • Visit{" "}
                      <a
                        href="https://www.google.com/business/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:no-underline"
                      >
                        Google Business Profile
                      </a>
                    </p>
                    <p>• Complete the verification process</p>
                    <p>• Come back and reconnect your profile</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAcceptUnverifiedProfile}
                    disabled={acceptingUnverified}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {acceptingUnverified ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Use for Testing
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-60"
                  >
                    Try Different Account
                  </button>
                </div>

                <button
                  onClick={handleLogoutGoogleProfile}
                  disabled={disconnecting}
                  className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LogOut size={18} />
                  {disconnecting ? "Logging out..." : "Logout Google Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-xl mb-4">
                <AlertCircle
                  className="text-red-600 dark:text-red-400"
                  size={32}
                />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                Connection Failed
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
                {error}
              </p>
              <button
                onClick={() => {
                  setStep("welcome");
                  setError(null);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
