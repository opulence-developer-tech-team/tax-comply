import { EntranceOverlay } from "@/components/layout/EntranceOverlay";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EntranceOverlay />
      {children}
    </>
  );
}
