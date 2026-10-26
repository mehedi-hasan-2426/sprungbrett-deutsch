import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ProgressProvider } from "../src/state/ProgressContext.tsx";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ProgressProvider>
      <Component {...pageProps} />
    </ProgressProvider>
  );
}
