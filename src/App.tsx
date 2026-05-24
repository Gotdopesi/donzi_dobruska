import HomePage from "@/pages/HomePage";
import CancelReservationPage from "@/pages/CancelReservationPage";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminReservationsPage from "@/pages/admin/AdminReservationsPage";
import AdminRevenuePage from "@/pages/admin/AdminRevenuePage";
import AdminServicesPage from "@/pages/admin/AdminServicesPage";
import { useRouter } from "@/lib/router";

export default function App() {
  const { pathname } = useRouter();

  if (pathname === "/zrusit-rezervaci") {
    return <CancelReservationPage />;
  }

  if (pathname === "/admin/login") {
    return <AdminLoginPage />;
  }

  if (pathname === "/admin/trzby") {
    return (
      <AdminLayout>
        <AdminRevenuePage />
      </AdminLayout>
    );
  }

  if (pathname === "/admin/sluzby") {
    return (
      <AdminLayout>
        <AdminServicesPage />
      </AdminLayout>
    );
  }

  if (pathname === "/admin") {
    return (
      <AdminLayout>
        <AdminReservationsPage />
      </AdminLayout>
    );
  }

  return <HomePage />;
}
