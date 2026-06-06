import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAWBd7UxY_7YtSBQiAkMHJ79Gcl07D61os",
  authDomain: "authentication-4d90d.firebaseapp.com",
  projectId: "authentication-4d90d",
  storageBucket: "authentication-4d90d.firebasestorage.app",
  messagingSenderId: "215878452724",
  appId: "1:215878452724:web:98cb0e15384392b02365a1",
  measurementId: "G-DJJS45M7QQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

if (typeof window !== "undefined") {
  isSupported()
    .then((ok) => {
      if (ok) getAnalytics(app);
    })
    .catch(() => {
      // Analytics is optional for auth flow.
    });
}

export { app, auth, googleProvider };
