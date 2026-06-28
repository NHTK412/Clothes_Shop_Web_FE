import { Outlet } from "react-router-dom";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar />
      <div className="ml-64 flex-1">
        <AdminHeader />
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
