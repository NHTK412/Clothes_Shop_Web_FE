import { Outlet } from "react-router-dom";
import ClientFooter from "../components/client/ClientFooter";
import ClientHeader from "../components/client/ClientHeader";

const ClientLayout = () => {
    return (
        <>
            <ClientHeader />
            <Outlet />
            <ClientFooter />
        </>
    );
}

export default ClientLayout;