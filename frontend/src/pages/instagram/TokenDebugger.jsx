import { useState } from "react";
import { AlertCircle, CheckCircle, Clock, Loader } from "lucide-react";
import { authFetch } from "../../services/authFetch";

export default function TokenDebugger() {
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [error, setError] = useState(null);

  const checkToken = async () => {
    setLoading(true);
    setError(null);
    setTokenInfo(null);

    try {
      const response = await authFetch("/api/reels/debug/token-status");
      if (response.success) {
        setTokenInfo(response);
      } else {
        setError(response.error || "Failed to fetch token status");
      }
    } catch (err) {
      setError(err.message || "Error checking token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          🔧 Instagram Token Debugger
        </h2>

        <button
          onClick={checkToken}
          disabled={loading}
          className="mb-6 px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-all flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Checking...
            </>
          ) : (
            "Check Token Status"
          )}
        </button>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={18} />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {tokenInfo?.success && tokenInfo?.credentials && (
          <div className="space-y-4">
            {/* Credentials */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex gap-2 mb-2">
                <CheckCircle
                  className="text-green-600 flex-shrink-0"
                  size={18}
                />
                <h3 className="font-semibold text-green-900">
                  Credentials Found ✓
                </h3>
              </div>
              <div className="space-y-2 text-sm text-green-800">
                <p>
                  <strong>Method:</strong> {tokenInfo.credentials.method}
                </p>
                <p>
                  <strong>Business Account ID:</strong>{" "}
                  {tokenInfo.credentials.igUserId}
                </p>
                <p>
                  <strong>Token:</strong> {tokenInfo.credentials.tokenPrefix}
                </p>
              </div>
            </div>

            {/* Session Details */}
            {tokenInfo?.session && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Session Details
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>
                    <strong>Status:</strong> {tokenInfo.session.status}
                  </p>
                  <p>
                    <strong>Instagram Username:</strong>{" "}
                    {tokenInfo.session.instagramUsername}
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      <strong>Expires In:</strong> {tokenInfo.session.expiresIn}
                    </span>
                  </div>
                  <p>
                    <strong>Expires At:</strong>{" "}
                    {new Date(tokenInfo.session.expiresAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>Last Refreshed:</strong>{" "}
                    {new Date(tokenInfo.session.lastRefreshed).toLocaleString()}
                  </p>
                  <p>
                    <strong>Scopes:</strong>
                  </p>
                  <ul className="list-disc list-inside pl-2">
                    {tokenInfo.session.scopes?.map((scope) => (
                      <li key={scope}>{scope}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Status */}
            {!tokenInfo.success && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle
                    className="text-yellow-600 flex-shrink-0"
                    size={18}
                  />
                  <div>
                    <p className="font-semibold text-yellow-900">
                      Instagram Not Connected
                    </p>
                    <p className="text-sm text-yellow-800 mt-1">
                      {tokenInfo.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Troubleshooting Guide */}
      <div className="mt-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">
          🐛 Troubleshooting
        </h3>
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">
              Error: Invalid OAuth access token
            </p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>
                Token might be expired - will auto-refresh if within 24h of
                expiry
              </li>
              <li>
                Instagram Business Account might not be linked to your Facebook
                Page
              </li>
              <li>
                App might not have instagram_content_publish scope approved
              </li>
              <li>Try reconnecting your Instagram account in settings</li>
            </ul>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-blue-900">
              💡 <strong>Tip:</strong> Token automatically refreshes 24 hours
              before expiration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
