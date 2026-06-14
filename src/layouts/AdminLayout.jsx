/* eslint-disable no-unused-vars */
import React from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react";

const AdminLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
