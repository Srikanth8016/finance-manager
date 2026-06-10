import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* Desktop: offset for sidebar. Mobile: padding bottom for bottom nav */}
      <main className="lg:ml-64 pb-20 lg:pb-0 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
