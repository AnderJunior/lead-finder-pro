import { ReactNode } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <main className="flex-1 ml-64 p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
