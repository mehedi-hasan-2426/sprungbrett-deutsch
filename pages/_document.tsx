import { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Practise German step by step with instant feedback. Sign in to save progress or try it as a guest." />
        <meta name="color-scheme" content="light dark" />
        <meta name="referrer" content="no-referrer" />
        <Script src="/appearance.js" strategy="beforeInteractive" defer={false} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
