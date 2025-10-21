// pages/_app.js
import "@/styles/globals.css";
import "@/styles/modern-dashboard.css";
import { SWRConfig } from "swr";
import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";

export default function App({ Component, pageProps }) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const checkSplashScreen = () => {
      const lastShown = localStorage.getItem('lastSplashShown');
      const now = new Date().getTime();
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (!lastShown || now - parseInt(lastShown) >= tenMinutes) {
        setShowSplash(true);
        localStorage.setItem('lastSplashShown', now.toString());
      }
    };

    checkSplashScreen();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <SWRConfig
        value={{
          provider: () => new Map(),
          revalidateOnFocus: false,
          shouldRetryOnError: true,
          errorRetryCount: 3,
        }}
      >
        <Component {...pageProps} />
      </SWRConfig>
    </>
  );
}
