import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoginScreen from "./screens/LoginScreen";
import CoachApp from "./screens/CoachApp";
import ClientApp from "./screens/ClientApp";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            setRole(snap.data().role);
            setUser({ ...u, ...snap.data() });
          } else {
            setUser(null);
            setRole(null);
            await signOut(auth);
          }
        } catch {
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ background: "#0b0c10", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 28, color: "#c9f", letterSpacing: 4 }}>CPL</div>
        <div style={{ color: "#444", fontSize: 12, marginTop: 8, letterSpacing: 2 }}>CHARGEMENT...</div>
      </div>
    </div>
  );

  if (!user || !role) return <LoginScreen />;
  if (role === "coach") return <CoachApp user={user} onLogout={() => signOut(auth)} />;
  if (role === "client") return <ClientApp user={user} onLogout={() => signOut(auth)} />;
  return <LoginScreen />;
}
