import DashboardNav from "./nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#1a1917]">
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
