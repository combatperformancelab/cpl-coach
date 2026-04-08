import { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const S = {
    wrap: { background: "#0b0c10", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Barlow',system-ui,sans-serif" },
    card: { width: "100%", maxWidth: 380, background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 20, padding: 32 },
    input: { width: "100%", background: "#1a1b26", border: "1px solid #2a2b3e", borderRadius: 10, padding: "13px 16px", color: "#e8e8e8", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 },
    btn: { width: "100%", background: loading ? "#1a1b26" : "linear-gradient(135deg,#c9f,#906fd4)", border: "none", borderRadius: 12, padding: "14px", color: "#0b0c10", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: 1, marginTop: 8 },
  };

  return (
    <div style={S.wrap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&family=Oswald:wght@500;600;700&display=swap');`}</style>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 36, color: "#c9f", letterSpacing: 5 }}>CPL</div>
        <div style={{ fontSize: 13, color: "#555", letterSpacing: 3, marginTop: 4 }}>COMBAT PERFORMANCE LAB</div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#e8e8e8" }}>Connexion</div>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} onKeyDown={e => e.key === "Enter" && login()} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} style={S.input} onKeyDown={e => e.key === "Enter" && login()} />
        {error && <div style={{ color: "#e63946", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <button onClick={login} style={S.btn}>{loading ? "CONNEXION..." : "SE CONNECTER"}</button>
      </div>
      <div style={{ marginTop: 24, fontSize: 12, color: "#333", textAlign: "center" }}>Accès réservé — Combat Performance Lab</div>
    </div>
  );
}
