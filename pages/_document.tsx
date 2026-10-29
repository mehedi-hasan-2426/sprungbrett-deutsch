import { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Practise German from A1 to A2 with instant feedback. No account, no tracking." />
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
