import StackPageProviderWrapper from "@/components/StackPageProviderWrapper";

import OfficialClientLayout from "./layout_for_client";

export default function OfficialLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StackPageProviderWrapper>
      <OfficialClientLayout>{children}</OfficialClientLayout>
    </StackPageProviderWrapper>
  );
}
