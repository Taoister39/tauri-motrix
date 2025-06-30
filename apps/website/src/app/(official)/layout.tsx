import OfficialLayoutClient from "./OfficialLayoutClient";

export default function OfficialLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OfficialLayoutClient>{children}</OfficialLayoutClient>;
}
