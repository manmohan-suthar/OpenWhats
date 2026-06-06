import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Database,
  Info,
} from "lucide-react";
import { useState } from "react";

export default function InstagramSettings() {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRespond: false,
    messageFilter: true,
    dataCollection: true,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your Instagram panel preferences and configurations
        </p>
      </div>

      {/* Account Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
            <SettingsIcon size={20} className="text-pink-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Account Settings
            </h2>
            <p className="text-xs text-slate-500">
              Basic account configuration
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
          {[
            { label: "Account Name", value: "Not Connected" },
            { label: "Account ID", value: "N/A" },
            { label: "Connection Status", value: "Disconnected" },
            { label: "Last Sync", value: "Never" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3"
            >
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {item.label}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Bell size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Notifications
            </h2>
            <p className="text-xs text-slate-500">
              Configure notification preferences
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
          {[
            {
              key: "notifications",
              label: "Enable Notifications",
              desc: "Receive notifications for new messages and interactions",
            },
            {
              key: "autoRespond",
              label: "Auto-Response",
              desc: "Automatically respond to messages when you're offline",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.label}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings[item.key] ? "bg-pink-600" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings[item.key] ? "translate-x-6" : ""}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
            <Lock size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Privacy & Security
            </h2>
            <p className="text-xs text-slate-500">
              Manage data privacy and security
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
          {[
            {
              key: "messageFilter",
              label: "Message Content Filter",
              desc: "Filter spam and offensive messages",
            },
            {
              key: "dataCollection",
              label: "Analytics Data Collection",
              desc: "Allow collection of analytics data",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.label}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings[item.key] ? "bg-pink-600" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings[item.key] ? "translate-x-6" : ""}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Database size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Data Management
            </h2>
            <p className="text-xs text-slate-500">
              Manage your data and exports
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-6">
          <button className="w-full px-4 py-3 text-left border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Export Data
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Download your account data
            </p>
          </button>
          <button className="w-full px-4 py-3 text-left border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Clear Cache
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Clear cached data from your browser
            </p>
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info
            size={20}
            className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1"
          />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Need Help?
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
              Check our documentation or contact support for assistance
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
