// pages/_app.js
import "@/styles/globals.css";
import "@/styles/modern-dashboard.css";
import { SWRConfig } from "swr";

export default function App({ Component, pageProps }) {
  return (
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
  );
}
