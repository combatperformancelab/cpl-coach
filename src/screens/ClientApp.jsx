import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, collection, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";

const S = {
  app: { fontFamily: "'Barlow',system-ui,sans-serif", background: "#0b0c10", minHeight: "100vh", color: "#e8e8e8", maxWidth: 480, margin: "0 auto" },
  header: { background: "linear-gradient(160deg,#12131a,#1a1b25)", borderBottom: "1px solid #23243a", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  tab: (a) => ({ flex: 1, padding: "11px 4px", background: "none", border: "none", borderBottom: a ? "2px solid #c9f" : "2px solid transparent", color: a ? "#c9f" : "#555", fontSize: 11, cursor: "pointer", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "inherit" }),
  btn: (c = "#c9f") => ({ background: c + "22", border: `1px solid ${c}55`, borderRadius: 10, padding: "9px 16px", color: c, fontSize: 13, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }),
  input: { width: "100%", background: "#1a1b26", border: "1px solid #2a2b3e", borderRadius: 10, padding: "10px 14px", color: "#e8e8e8", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
};

export default function ClientApp({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("programme");
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const msgEndRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", user.uid), snap => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (tab !== "messages") return;
    const q = query(collection(db, "clients", user.uid, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [tab, user.uid]);

  const toggleWeek = async (wi) => {
    if (!profile) return;
    const weeks = profile.program.weeks.map((w, i) => i === wi ? { ...w, done: !w.done } : w);
    await updateDoc(doc(db, "clients", user.uid), { "program.weeks": weeks });
  };

  const validateSession = async () => {
    if (!profile) return;
    const sessions = (profile.stats?.sessions || 0) + 1;
    await updateDoc(doc(db, "clients", user.uid), { "stats.sessions": sessions });
  };

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    await addDoc(collection(db, "clients", user.uid, "messages"), {
      text: msgText, from: "client", senderName: profile?.name || "Athlète", createdAt: serverTimestamp()
    });
    setMsgText("");
  };

  if (!profile) return (
    <div style={{ background: "#0b0c10", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#c9f", fontFamily: "'Oswald',sans-serif", fontSize: 20, letterSpacing: 3 }}>CHARGEMENT...</div>
    </div>
  );

  const color = profile.color || "#c9f";
  const done = profile.program?.weeks?.filter(w => w.done).length || 0;
  const total = profile.program?.weeks?.length || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&family=Oswald:wght@500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      <div style={S.header}>
        <div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 20, color, letterSpacing: 3 }}>CPL</div>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>{profile.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'Oswald',sans-serif" }}>{profile.stats?.sessions || 0}</div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>SÉANCES</div>
          </div>
          <button onClick={onLogout} style={{ ...S.btn("#666"), padding: "6px 10px", fontSize: 11 }}>Déco</button>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #1a1b26", background: "#0e0f16" }}>
        {[["programme", "ðŸ’ª Programme"], ["messages", "ðŸ’¬ Messages"]].map(([key, label]) => (
          <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16, overflowY: "auto" }}>

        {/* PROGRAMME */}
        {tab === "programme" && (
          <div>
            {/* Progression globale */}
            <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 14, color: "#555", letterSpacing: 2, marginBottom: 8 }}>PROGRESSION</div>
              <div style={{ fontSize: 48, fontWeight: 800, color, fontFamily: "'Oswald',sans-serif", lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{done}/{total} semaines complétées</div>
              <div style={{ height: 6, background: "#1a1b26", borderRadius: 3, marginTop: 14, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 3, transition: "width 0.5s ease" }} />
              </div>
            </div>

            {/* Valider séance */}
            <button onClick={validateSession} style={{ width: "100%", background: `linear-gradient(135deg, ${color}33, ${color}11)`, border: `2px solid ${color}55`, borderRadius: 16, padding: "18px", color, fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, marginBottom: 16 }}>
              âœ… VALIDER MA SÉANCE DU JOUR
            </button>

            {/* Semaines */}
            {profile.program?.weeks?.length > 0 && (
              <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>MES SEMAINES</div>
                {profile.program.weeks.map((w, i) => (
                  <div key={i} onClick={() => toggleWeek(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < profile.program.weeks.length - 1 ? "1px solid #1a1b26" : "none", cursor: "pointer" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: w.done ? color + "33" : "#1a1b26", border: `2px solid ${w.done ? color : "#2a2b3a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, transition: "all 0.2s" }}>{w.done ? "âœ“" : "â—‹"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: w.done ? "#e8e8e8" : "#777" }}>{w.label}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{w.focus}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: w.done ? color : "#444", background: (w.done ? color : "#333") + "22", padding: "3px 10px", borderRadius: 20, border: `1px solid ${w.done ? color : "#333"}55` }}>{w.done ? "FAIT âœ“" : "À FAIRE"}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Exercices */}
            {profile.program?.exercises?.length > 0 && (
              <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>EXERCICES DU PROGRAMME</div>
                {profile.program.exercises.map((ex, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < profile.program.exercises.length - 1 ? "1px solid #1a1b26" : "none" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ex.name}</div>
                      {ex.note && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{ex.note}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}>{ex.sets}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{ex.load}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profile.program?.weeks?.length === 0 && profile.program?.exercises?.length === 0 && (
              <div style={{ color: "#444", textAlign: "center", padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>â ³</div>
                Ton programme arrive bientôt !<br />
                <span style={{ fontSize: 12, color: "#333", marginTop: 8, display: "block" }}>Ton coach prépare tout ça pour toi.</span>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES */}
        {tab === "messages" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
              {messages.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 32, fontSize: 13 }}>Pas encore de message â€” dis bonjour à ton coach !</div>}
              {messages.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.from === "client" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: m.from === "client" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.from === "client" ? color + "cc" : "#1a1b26", border: m.from !== "client" ? "1px solid #2a2b3a" : "none" }}>
                    {m.from !== "client" && <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Coach</div>}
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <div style={{ paddingTop: 12, borderTop: "1px solid #1a1b26", display: "flex", gap: 8 }}>
              <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Message à ton coach..." style={{ ...S.input, flex: 1 }} />
              <button onClick={sendMsg} style={{ ...S.btn(color), padding: "10px 16px", fontSize: 16 }}>âž¤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
