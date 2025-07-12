import "./base.css";

// interface BaseData {
//   type: string;
//   data: unknown;
// }

function IframeEmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

export default IframeEmbedLayout;
