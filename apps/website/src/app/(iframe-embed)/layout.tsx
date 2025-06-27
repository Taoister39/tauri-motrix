import Script from "next/script";

// interface BaseData {
//   type: string;
//   data: unknown;
// }

function IframeEmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Script src="/iframe-message.js" strategy="beforeInteractive"></Script>
    </>
  );
}

export default IframeEmbedLayout;
