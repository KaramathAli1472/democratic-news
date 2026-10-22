import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../firebase";
import { watchAuth, adminLogout } from "../services/authService";

function ProtectedAdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = watchAuth(async (user) => {
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnapshot = await getDoc(adminRef);

        if (adminSnapshot.exists()) {
          setAllowed(true);
        } else {
          await adminLogout();
          setAllowed(false);
        }
      } catch (error) {
        console.error("Admin verification failed:", error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Checking admin access...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedAdminRoute;