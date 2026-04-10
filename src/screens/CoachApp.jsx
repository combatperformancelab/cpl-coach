iimport { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, doc, setDoc, updateDoc, onSnapshot,
  addDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const SPORTS = ["MMA", "Boxe", "Judo", "Kick-boxing", "Muay Thai", "Lutte"];
const LEVELS = ["Loisir", "Amateur", "Amateur élite", "Semi-pro", "Pro"];
const SPORT_ICONS = { MMA: "🥊", Boxe: "🥊", Judo: "🥋", "Kick-boxing": "🦵", "Muay Thai": "🥊", Lutte: "🤼" };

const S = {
  app: { fontFamily: "'Barlow',system-ui,sans-serif", background: "#0b0c10", minHeight: "100vh", color: "#e8e8e8", maxWidth: 480, margin: "0 auto" },
  header: { background: "linear-gradient(160deg,#12131a,#1a1b25)", borderBottom: "1px solid #23243a", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontFamily: "'Oswald',sans-serif", fontSize: 22, letterSpacing: 3, color: "#c9f" },
  logoSub: { fontSize: 10, color: "#555", letterSpacing: 2 },
  badge: (c) => ({ background: c + "22", color: c, border: `1px solid ${c}55`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }),
  card: { background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 16, padding: 16, marginBottom: 12, cursor: "pointer" },
  tab: (a) => ({ flex: 1, padding: "11px 4px", background: "none", border: "none", borderBottom: a ? "2px solid #c9f" : "2px solid transparent", color: a ? "#c9f" : "#555", fontSize: 11, cursor: "pointer", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "inherit" }),
  btn: (c = "#c9f") => ({ background: c + "22", border: `1px solid ${c}55`, borderRadius: 10, padding: "9px 16px", color: c, fontSize: 13, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", letterSpacing: 0.5 }),
  input: { width: "100%", background: "#1a1b26", border: "1px solid #2a2b3e", borderRadius: 10, padding: "10px 14px", color: "#e8e8e8", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  statBox: (c) => ({ background: c + "11", border: `1px solid ${c}33`, borderRadius: 12, padding: "12px 14px", flex: 1, textAlign: "center" }),
};

export default function CoachApp({ user, onLogout }) {
  const [clients, setClients] = useState([]);
  const [view, setView] = useState("dashboard");
  const [activeClient, setActiveClient] = useState(null);
  const [clientTab, setClientTab] = useState("fiche");
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", sport: "MMA", age: "", weight: "", category: "", level: "Amateur", goal: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [editProgram, setEditProgram] = useState(false);
  const [iaInput, setIaInput] = useState("");
  const [iaMessages, setIaMessages] = useState([]);
  const [iaLoading, setIaLoading] = useState(false);
  const msgEndRef = useRef(null);
  const iaEndRef = useRef(null);

  // Charger les clients en temps réel
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clients"), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Charger messages en temps réel
  useEffect(() => {
    if (!activeClient || clientTab !== "messages") return;
    const q = query(collection(db, "clients", activeClient.id, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [activeClient, clientTab]);

  useEffect(() => { iaEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [iaMessages, iaLoading]);

  const openClient = (c) => { setActiveClient(c); setView("client"); setClientTab("fiche"); setIaMessages([]); };

  const createClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.password) { setAddError("Nom, email et mot de passe requis."); return; }
    setAdding(true); setAddError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, newClient.email, newClient.password);
      const uid = cred.user.uid;
      const colors = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#9b2226", "#c9f"];
      const color = colors[clients.length % colors.length];
      const avatar = newClient.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      await setDoc(doc(db, "users", uid), { role: "client", name: newClient.name, email: newClient.email, clientId: uid });
      await setDoc(doc(db, "clients", uid), {
        uid, name: newClient.name, email: newClient.email,
        sport: newClient.sport, age: +newClient.age, weight: +newClient.weight,
        category: newClient.category, level: newClient.level, goal: newClient.goal,
        avatar, color, joinDate: new Date().toISOString().slice(0, 10),
        stats: { sessions: 0, poids: [+newClient.weight || 0], notes: [5] },
        program: { name: "Programme à définir", weeks: [], exercises: [] },
      });
      setShowAdd(false);
      setNewClient({ name: "", email: "", password: "", sport: "MMA", age: "", weight: "", category: "", level: "Amateur", goal: "" });
    } catch (e) {
      setAddError(e.code === "auth/email-already-in-use" ? "Cet email est déjà utilisé." : "Erreur : " + e.message);
    } finally { setAdding(false); }
  };

  const sendMsg = async () => {
    if (!msgInput.trim()) return;
    await addDoc(collection(db, "clients", activeClient.id, "messages"), {
      text: msgInput, from: "coach", senderName: "Coach", createdAt: serverTimestamp()
    });
    setMsgInput("");
  };

  const updateProgram = async (updated) => {
    await updateDoc(doc(db, "clients", activeClient.id), { program: updated });
    setActiveClient({ ...activeClient, program: updated });
  };

  const toggleWeek = (wi) => {
    const weeks = activeClient.program.weeks.map((w, i) => i === wi ? { ...w, done: !w.done } : w);
    updateProgram({ ...activeClient.program, weeks });
  };

  const updateExercise = (ei, field, val) => {
    const exercises = activeClient.program.exercises.map((e, i) => i === ei ? { ...e, [field]: val } : e);
    setActiveClient({ ...activeClient, program: { ...activeClient.program, exercises } });
  };

  const saveExercises = () => {
    updateProgram(activeClient.program);
    setEditProgram(false);
  };

  const addExercise = () => {
    const exercises = [...activeClient.program.exercises, { name: "Nouvel exercice", sets: "3x10", load: "—", note: "" }];
    setActiveClient({ ...activeClient, program: { ...activeClient.program, exercises } });
  };

  const sendIa = async () => {
    if (!iaInput.trim() || iaLoading) return;
    const c = activeClient;
    const userMsg = { role: "user", content: iaInput };
    const newHist = [...iaMessages, userMsg];
    setIaMessages(newHist); setIaInput(""); setIaLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `Tu es un assistant préparateur physique expert en sports de combat. Athlète : ${c.name}, ${c.age}ans, ${c.weight}kg, ${c.sport} (${c.category}), niveau ${c.level}. Objectif : ${c.goal}. Programme : ${c.program?.name}. Réponds en français, concis et professionnel.`,
          messages: newHist,
        })
      });
      const data = await res.json();
      setIaMessages([...newHist, { role: "assistant", content: data.content?.[0]?.text || "Erreur." }]);
    } catch { setIaMessages([...newHist, { role: "assistant", content: "Erreur de connexion." }]); }
    finally { setIaLoading(false); }
  };

  // ── DASHBOARD ──────────────────────────────────────────────────────────
  if (view === "dashboard") return (
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&family=Oswald:wght@500;600;700&display=swap'); *{box-sizing:border-box} .cc:hover{border-color:#9b59b655!important;transform:translateY(-2px)}`}</style>
      <div style={S.header}>
        <div><div style={S.logo}>CPL</div><div style={S.logoSub}>COMBAT PERFORMANCE LAB</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAdd(true)} style={{ ...S.btn("#c9f"), fontSize: 18, padding: "6px 14px" }}>＋</button>
          <button onClick={onLogout} style={{ ...S.btn("#666"), padding: "6px 12px", fontSize: 12 }}>Déco</button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
        {[["ATHLÈTES", clients.length, "#c9f"], ["SÉANCES", clients.reduce((a, c) => a + (c.stats?.sessions || 0), 0), "#f4a261"], ["EN FORME", clients.filter(c => (c.stats?.notes?.at(-1) || 0) >= 7).length, "#2a9d8f"]].map(([l, v, col]) => (
          <div key={l} style={S.statBox(col)}>
            <div style={{ fontSize: 26, fontWeight: 800, color: col, fontFamily: "'Oswald',sans-serif" }}>{v}</div>
            <div style={{ fontSize: 10, color: "#666", letterSpacing: 1 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>MES ATHLÈTES</div>
        {clients.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 32, fontSize: 14 }}>Aucun athlète — appuie sur ＋ pour en ajouter</div>}
        {clients.map(c => {
          const lastNote = c.stats?.notes?.at(-1) || 5;
          const noteColor = lastNote >= 8 ? "#2a9d8f" : lastNote >= 6 ? "#f4a261" : "#e63946";
          const done = c.program?.weeks?.filter(w => w.done).length || 0;
          const total = c.program?.weeks?.length || 0;
          return (
            <div key={c.id} style={S.card} className="cc" onClick={() => openClient(c)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: (c.color || "#c9f") + "22", border: `2px solid ${(c.color || "#c9f")}55`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: c.color || "#c9f", fontFamily: "'Oswald',sans-serif", flexShrink: 0 }}>{c.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                    <span style={S.badge(c.color || "#c9f")}>{SPORT_ICONS[c.sport] || "🥊"} {c.sport}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{c.category} · {c.weight}kg · {c.level}</div>
                  {total > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", gap: 3 }}>{c.program.weeks.map((w, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: w.done ? (c.color || "#c9f") : "#2a2b3a" }} />)}</div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{done}/{total} semaines</div>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: noteColor, fontFamily: "'Oswald',sans-serif" }}>{lastNote}/10</div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>FORME</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal ajout client */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", display: "flex", alignItems: "flex-end", zIndex: 100 }} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#13141c", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", border: "1px solid #2a2b3e", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 18, color: "#c9f", letterSpacing: 2, marginBottom: 16 }}>NOUVEL ATHLÈTE</div>
            {[["Nom complet", "name", "text"], ["Email", "email", "email"], ["Mot de passe", "password", "password"], ["Âge", "age", "number"], ["Poids (kg)", "weight", "number"], ["Catégorie (ex: -77kg)", "category", "text"], ["Objectif", "goal", "text"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4, letterSpacing: 1 }}>{label.toUpperCase()}</div>
                <input type={type} value={newClient[key]} onChange={e => setNewClient({ ...newClient, [key]: e.target.value })} style={S.input} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[["Sport", "sport", SPORTS], ["Niveau", "level", LEVELS]].map(([label, key, opts]) => (
                <div key={key} style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 4, letterSpacing: 1 }}>{label.toUpperCase()}</div>
                  <select value={newClient[key]} onChange={e => setNewClient({ ...newClient, [key]: e.target.value })} style={{ ...S.input, appearance: "none" }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {addError && <div style={{ color: "#e63946", fontSize: 13, marginBottom: 8 }}>{addError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowAdd(false)} style={{ ...S.btn("#666"), flex: 1 }}>Annuler</button>
              <button onClick={createClient} disabled={adding} style={{ ...S.btn("#c9f"), flex: 1, background: "#c9f22" }}>{adding ? "Création..." : "Créer le profil"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── VUE CLIENT ─────────────────────────────────────────────────────────
  const c = activeClient;
  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column", height: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&family=Oswald:wght@500;600;700&display=swap'); *{box-sizing:border-box} @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>

      <div style={{ ...S.header, gap: 12, flexShrink: 0 }}>
        <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: "#c9f", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: (c.color || "#c9f") + "22", border: `2px solid ${(c.color || "#c9f")}55`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: c.color || "#c9f", fontFamily: "'Oswald',sans-serif" }}>{c.avatar}</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div><div style={{ fontSize: 11, color: "#666" }}>{c.sport} · {c.category}</div></div>
        <span style={S.badge(c.color || "#c9f")}>{c.stats?.sessions || 0} séances</span>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #1a1b26", background: "#0e0f16", flexShrink: 0 }}>
        {[["fiche", "📋 Fiche"], ["programme", "💪 Prog."], ["messages", "💬 Msgs"], ["ia", "🤖 IA"]].map(([key, label]) => (
          <button key={key} style={S.tab(clientTab === key)} onClick={() => setClientTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: clientTab === "messages" || clientTab === "ia" ? 0 : 16 }}>

        {/* FICHE */}
        {clientTab === "fiche" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[["Âge", c.age + " ans", "#c9f"], ["Poids", c.weight + " kg", "#f4a261"], ["Sessions", c.stats?.sessions || 0, "#2a9d8f"]].map(([l, v, col]) => (
                <div key={l} style={S.statBox(col)}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: "'Oswald',sans-serif" }}>{v}</div>
                  <div style={{ fontSize: 10, color: "#666", letterSpacing: 1 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>INFORMATIONS</div>
              {[["Objectif", c.goal], ["Niveau", c.level], ["Sport", c.sport], ["Catégorie", c.category], ["Suivi depuis", c.joinDate]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1a1b26" }}>
                  <span style={{ color: "#666", fontSize: 13 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            {/* Évolution poids */}
            {c.stats?.poids?.length > 1 && (
              <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>ÉVOLUTION POIDS</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                  {c.stats.poids.map((p, i) => {
                    const min = Math.min(...c.stats.poids), max = Math.max(...c.stats.poids);
                    const h = max === min ? 40 : Math.round(20 + ((p - min) / (max - min)) * 40);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 9, color: "#666" }}>{p}</div>
                        <div style={{ width: "100%", height: h, background: `${c.color || "#c9f"}${i === c.stats.poids.length - 1 ? "cc" : "44"}`, borderRadius: "4px 4px 0 0" }} />
                        <div style={{ fontSize: 9, color: "#444" }}>S{i + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROGRAMME */}
        {clientTab === "programme" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 16, color: "#c9f", letterSpacing: 1 }}>{c.program?.name || "Aucun programme"}</div>
              <button onClick={() => editProgram ? saveExercises() : setEditProgram(true)} style={S.btn(editProgram ? "#f4a261" : "#c9f")}>
                {editProgram ? "✓ Sauver" : "✏️ Modifier"}
              </button>
            </div>
            {c.program?.weeks?.length > 0 && (
              <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>PROGRESSION</div>
                {c.program.weeks.map((w, i) => (
                  <div key={i} onClick={() => toggleWeek(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < c.program.weeks.length - 1 ? "1px solid #1a1b26" : "none", cursor: "pointer" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: w.done ? (c.color || "#c9f") + "33" : "#1a1b26", border: `2px solid ${w.done ? (c.color || "#c9f") : "#2a2b3a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{w.done ? "✓" : "○"}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: w.done ? "#e8e8e8" : "#666" }}>{w.label} — {w.focus}</div></div>
                    <div style={S.badge(w.done ? (c.color || "#c9f") : "#444")}>{w.done ? "FAIT" : "À FAIRE"}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: "#13141c", border: "1px solid #1e1f2e", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>EXERCICES</div>
              {c.program?.exercises?.map((ex, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: i < c.program.exercises.length - 1 ? "1px solid #1a1b26" : "none" }}>
                  {editProgram ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input value={ex.name} onChange={e => updateExercise(i, "name", e.target.value)} style={{ ...S.input, fontWeight: 700 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={ex.sets} onChange={e => updateExercise(i, "sets", e.target.value)} placeholder="Séries" style={{ ...S.input, flex: 1, fontSize: 12 }} />
                        <input value={ex.load} onChange={e => updateExercise(i, "load", e.target.value)} placeholder="Charge" style={{ ...S.input, flex: 1, fontSize: 12 }} />
                      </div>
                      <input value={ex.note} onChange={e => updateExercise(i, "note", e.target.value)} placeholder="Notes..." style={{ ...S.input, fontSize: 12 }} />
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontSize: 14, fontWeight: 600 }}>{ex.name}</div>{ex.note && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{ex.note}</div>}</div>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 700, color: c.color || "#c9f" }}>{ex.sets}</div><div style={{ fontSize: 11, color: "#666" }}>{ex.load}</div></div>
                    </div>
                  )}
                </div>
              ))}
              {editProgram && <button onClick={addExercise} style={{ ...S.btn("#c9f"), width: "100%", marginTop: 12, textAlign: "center" }}>＋ Ajouter exercice</button>}
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {clientTab === "messages" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 32, fontSize: 13 }}>Aucun message — commencez la conversation</div>}
              {messages.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.from === "coach" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: m.from === "coach" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.from === "coach" ? (c.color || "#c9f") + "cc" : "#1a1b26", border: m.from !== "coach" ? "1px solid #2a2b3a" : "none" }}>
                    {m.from !== "coach" && <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>{m.senderName}</div>}
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <div style={{ padding: 12, borderTop: "1px solid #1a1b26", display: "flex", gap: 8, background: "#0e0f16" }}>
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Message..." style={{ ...S.input, flex: 1 }} />
              <button onClick={sendMsg} style={{ ...S.btn(c.color || "#c9f"), padding: "10px 16px", fontSize: 16 }}>➤</button>
            </div>
          </div>
        )}

        {/* IA */}
        {clientTab === "ia" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 16px", background: "#13141c", borderBottom: "1px solid #1e1f2e", flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: "#c9f", fontWeight: 700, letterSpacing: 1 }}>🤖 ASSISTANT IA — {c.name}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Conseils personnalisés basés sur le profil de l'athlète</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {iaMessages.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 32, fontSize: 13 }}>Pose une question sur {c.name.split(" ")[0]}</div>}
              {iaMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "#c9f22" : "#13141c", border: "1px solid", borderColor: m.role === "user" ? "#c9f44" : "#1e1f2e", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {iaLoading && <div style={{ display: "flex", gap: 5, padding: "12px 16px", background: "#13141c", border: "1px solid #1e1f2e", borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>{[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#c9f", animation: `pulse 1.2s ${i*.2}s infinite` }} />)}</div>}
              <div ref={iaEndRef} />
            </div>
            <div style={{ padding: 12, borderTop: "1px solid #1a1b26", display: "flex", gap: 8, background: "#0e0f16" }}>
              <input value={iaInput} onChange={e => setIaInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendIa()} placeholder={`Analyser ${c.name.split(" ")[0]}...`} style={{ ...S.input, flex: 1 }} />
              <button onClick={sendIa} disabled={iaLoading} style={{ ...S.btn("#c9f"), padding: "10px 16px", fontSize: 16 }}>➤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
