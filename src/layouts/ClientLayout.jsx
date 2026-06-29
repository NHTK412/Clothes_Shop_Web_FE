import { Outlet } from "react-router-dom";
import ClientFooter from "../components/client/ClientFooter";
import ClientHeader from "../components/client/ClientHeader";

const ClientLayout = () => {
    return (
        <>
            <ClientHeader />
            <div className="client-shell-content min-w-0">
                <Outlet />
            </div>
            <ClientFooter />
        </>
    );
}

export default ClientLayout;
