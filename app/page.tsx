"use client";

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Flame,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "home" | "play" | "chat" | "receipt" | "admin";
type Team = { id: "a" | "b"; name: string; route: string; color: string; color2: string; backers: number };
type Registration = { name: string; phone: string; team: "a" | "b"; code: string; status: "confirmed" | "pending" | "failed"; time: string };

const baseTeams: Team[] = [
  { id: "a", name: "Finalist A", route: "Winner · Spain vs France", color: "#f35f44", color2: "#ffb45e", backers: 18 },
  { id: "b", name: "Finalist B", route: "Winner · England vs Argentina", color: "#3568e8", color2: "#58c6ff", backers: 12 },
];

const seededRegistrations: Registration[] = [
  { name: "Amina K.", phone: "2547•••••218", team: "a", code: "SGQ4T2M8KU", status: "confirmed", time: "Today, 12:42" },
  { name: "Brian O.", phone: "2547•••••791", team: "b", code: "SGQ7R9P2HT", status: "confirmed", time: "Today, 12:18" },
  { name: "Njeri M.", phone: "2541•••••044", team: "a", code: "SGQ8K3L6VP", status: "pending", time: "Today, 11:57" },
  { name: "Kevin T.", phone: "2547•••••509", team: "b", code: "—", status: "failed", time: "Today, 11:21" },
];

const seededMessages = [
  { name: "Amina", initials: "AK", text: "Final week! Who else is staying up for the full match?", time: "12:05", color: "coral" },
  { name: "Brian", initials: "BO", text: "No way I'm missing it. Finalist B all the way 👀", time: "12:08", color: "blue" },
  { name: "Njeri", initials: "NM", text: "The underdog side of this pool is looking tempting.", time: "12:12", color: "gold" },
];

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const diff = Math.max(0, new Date("2026-07-19T22:00:00+03:00").getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

function Mark({ small = false }: { small?: boolean }) {
  return <span className={small ? "mark mark-small" : "mark"}><Trophy size={small ? 15 : 19} strokeWidth={2.5} /></span>;
}

export default function PoolPage() {
  const countdown = useCountdown();
  const [view, setView] = useState<View>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teams, setTeams] = useState(baseTeams);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState<Registration | null>(null);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState(seededMessages);
  const [message, setMessage] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [registrations, setRegistrations] = useState(seededRegistrations);
  const [winnerCandidate, setWinnerCandidate] = useState<"a" | "b" | null>(null);
  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [editingTeams, setEditingTeams] = useState(false);
  const [draftNames, setDraftNames] = useState([teams[0].name, teams[1].name]);

  useEffect(() => {
    try {
      const savedTeams = localStorage.getItem("final-pool-teams");
      const savedReceipt = localStorage.getItem("final-pool-receipt");
      if (savedTeams) setTeams(JSON.parse(savedTeams));
      if (savedReceipt) setReceipt(JSON.parse(savedReceipt));
    } catch { /* demo storage is optional */ }
  }, []);

  const confirmed = registrations.filter((item) => item.status === "confirmed").length + 28;
  const totalPool = confirmed * 100;
  const teamTotals = useMemo(() => teams.map((team) => ({ ...team, amount: team.backers * 100 })), [teams]);

  const navigate = (next: View) => {
    setView(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const beginPick = (id: "a" | "b") => {
    setSelected(id);
    setStep(2);
    navigate("play");
  };

  const submitRegistration = (e: FormEvent) => {
    e.preventDefault();
    const valid = /^(07|01)\d{8}$/.test(phone.replace(/\s/g, ""));
    if (!name.trim() || !valid || !age || !terms) {
      setFormError("Add your name, a valid Safaricom number, and accept both checkboxes.");
      return;
    }
    setFormError("");
    setStep(2);
  };

  const submitPayment = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) { setFormError("Choose a finalist before submitting your payment."); return; }
    if (!/^[A-Z0-9]{8,12}$/i.test(code.trim())) { setFormError("Enter the 10-character M-Pesa confirmation code from your message."); return; }
    const cleanPhone = phone.replace(/\s/g, "");
    const item: Registration = {
      name: name || "Demo Player",
      phone: cleanPhone ? `254${cleanPhone.slice(1, 3)}•••••${cleanPhone.slice(-3)}` : "2547•••••000",
      team: selected,
      code: code.toUpperCase(),
      status: "pending",
      time: "Just now",
    };
    setReceipt(item);
    setRegistrations((current) => [item, ...current]);
    localStorage.setItem("final-pool-receipt", JSON.stringify(item));
    setFormError("");
    navigate("receipt");
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages((current) => [...current, { name: name.split(" ")[0] || "You", initials: name ? name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "YO", text: message.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: "green" }]);
    setMessage("");
  };

  const loginAdmin = (e: FormEvent) => {
    e.preventDefault();
    if (passcode.toUpperCase() === "FINAL26") setAdminUnlocked(true);
    else setFormError("That passcode doesn't match. Use FINAL26 for this preview.");
  };

  const saveTeams = () => {
    const next = teams.map((team, index) => ({ ...team, name: draftNames[index].trim() || team.name }));
    setTeams(next);
    localStorage.setItem("final-pool-teams", JSON.stringify(next));
    setEditingTeams(false);
  };

  const markWinner = () => {
    if (!winnerCandidate) return;
    const candidate = teams.find((team) => team.id === winnerCandidate)!;
    if (confirmText.trim().toLowerCase() !== candidate.name.toLowerCase()) return;
    setWinner(winnerCandidate);
    setWinnerCandidate(null);
    setConfirmText("");
  };

  const teamName = (id: "a" | "b") => teams.find((team) => team.id === id)?.name || id;

  return (
    <main>
      <div className="topline">PRIVATE OFFICE POOL · KES 100 ENTRY · 18+ ONLY</div>
      <header className="site-header">
        <button className="brand" onClick={() => navigate("home")} aria-label="Home">
          <Mark />
          <span><strong>THE FINAL</strong><small>WHISTLE</small></span>
        </button>
        <nav className={mobileOpen ? "nav nav-open" : "nav"}>
          <button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}>Pool</button>
          <button className={view === "play" ? "active" : ""} onClick={() => navigate("play")}>Place a bet</button>
          <button className={view === "chat" ? "active" : ""} onClick={() => navigate("chat")}>Chat <span className="nav-dot">3</span></button>
          {receipt && <button className={view === "receipt" ? "active" : ""} onClick={() => navigate("receipt")}>My receipt</button>}
          <button className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}><LockKeyhole size={14} /> Admin</button>
        </nav>
        <div className="header-actions">
          <button className="outline-button" onClick={() => navigate(receipt ? "receipt" : "play")}><UserRound size={16} /> {receipt ? "My entry" : "Join pool"}</button>
          <button className="mobile-menu" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      {view === "home" && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="pulse" /> ENTRIES ARE OPEN</div>
              <h1>One match.<br /><em>One office.</em><br />All the bragging rights.</h1>
              <p>Pick the champion, back your call with KES 100, and share the pool if your side lifts the trophy.</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => navigate("play")}>Make your pick <ArrowRight size={18} /></button>
                <span className="micro-proof"><ShieldCheck size={18} /> Manual M-Pesa verification</span>
              </div>
            </div>
            <div className="hero-art" aria-label="Final match illustration">
              <div className="hero-stamp">METLIFE<br /><strong>2026</strong></div>
              <div className="stadium-ring ring-one" />
              <div className="stadium-ring ring-two" />
              <div className="trophy-glow" />
              <Trophy className="hero-trophy" strokeWidth={1.2} />
              <div className="floating-card card-left"><span>30</span><small>BACKERS</small></div>
              <div className="floating-card card-right"><span>KES 3K</span><small>IN THE POT</small></div>
              <div className="scribble">FINAL<br />NIGHT!</div>
            </div>
          </section>

          <section className="match-strip">
            <div className="match-meta"><CalendarDays size={18} /><span><small>THE FINAL</small> SUN · 19 JUL</span></div>
            <div className="versus-small"><strong>{teams[0].name}</strong><span>VS</span><strong>{teams[1].name}</strong></div>
            <div className="match-meta right"><Clock3 size={18} /><span><small>KICKOFF · EAT</small> 10:00 PM</span></div>
          </section>

          <section className="content-shell pool-section">
            <div className="section-heading">
              <div><div className="eyebrow dark">THE OFFICE HAS SPOKEN</div><h2>Where the pool stands</h2></div>
              <div className="pool-total"><small>TOTAL POT</small><strong>{money.format(totalPool)}</strong><span>{confirmed} confirmed entries</span></div>
            </div>
            {winner && <div className="winner-banner"><Crown /> <span><strong>{teamName(winner)} are the champions.</strong> The payout list is ready for the organiser.</span></div>}
            <div className="team-grid">
              {teamTotals.map((team, index) => (
                <article className="team-card" key={team.id} style={{ "--team": team.color, "--team2": team.color2 } as React.CSSProperties}>
                  <div className="team-wash" />
                  <div className="team-top"><span className="team-seed">0{index + 1}</span><span className="trend"><Flame size={14} /> {index === 0 ? "Leading" : "Underdog"}</span></div>
                  <div className="team-crest">{team.id.toUpperCase()}<small>FINALIST</small></div>
                  <div className="team-info"><span>{team.route}</span><h3>{team.name}</h3></div>
                  <div className="team-stats"><div><strong>{team.backers}</strong><small>BACKERS</small></div><div><strong>{money.format(team.amount)}</strong><small>STAKED</small></div></div>
                  <button onClick={() => beginPick(team.id)}>Back {team.name} <ArrowRight size={17} /></button>
                </article>
              ))}
            </div>
            <div className="share-bar"><div className="split-bar"><span style={{ width: `${Math.round((teams[0].backers / (teams[0].backers + teams[1].backers)) * 100)}%` }} /></div><span>{Math.round((teams[0].backers / (teams[0].backers + teams[1].backers)) * 100)}% of the office is backing {teams[0].name}</span></div>
          </section>

          <section className="countdown-section">
            <div><div className="eyebrow warm">THE WINDOW IS CLOSING</div><h2>Get your pick in<br />before kickoff.</h2><p>Confirmed entries lock at 10:00 PM EAT. No switching sides after payment is verified.</p></div>
            <div className="countdown">
              {[ [countdown.days, "DAYS"], [countdown.hours, "HRS"], [countdown.mins, "MIN"], [countdown.secs, "SEC"] ].map(([value, label], index) => <div key={label as string}><strong>{String(value).padStart(2, "0")}</strong><small>{label}</small>{index < 3 && <i>:</i>}</div>)}
            </div>
          </section>

          <section className="content-shell how-section">
            <div className="section-heading"><div><div className="eyebrow dark">NO DRAMA, JUST FOOTBALL</div><h2>Three steps. Then we watch.</h2></div><button className="text-link" onClick={() => navigate("play")}>Read the pool rules <ArrowRight size={15} /></button></div>
            <div className="steps-grid">
              <div><span>01</span><UserRound /><h3>Register</h3><p>Your full name and Safaricom number. We keep phone numbers private.</p></div>
              <div><span>02</span><WalletCards /><h3>Pick & pay</h3><p>Choose a finalist and send exactly KES 100 via M-Pesa.</p></div>
              <div><span>03</span><Trophy /><h3>Win the pool</h3><p>The full pot is split evenly among confirmed winning backers.</p></div>
            </div>
          </section>
        </>
      )}

      {view === "play" && (
        <section className="app-page content-shell">
          <div className="page-intro"><div className="eyebrow dark">YOUR ENTRY</div><h1>Make your call.</h1><p>Registration takes a minute. Your pick only counts after the organiser verifies your M-Pesa code.</p></div>
          <div className="stepper"><span className={step >= 1 ? "done" : ""}><i>{step > 1 ? <Check /> : "1"}</i> Register</span><b /><span className={step >= 2 ? "done" : ""}><i>2</i> Pick a team</span><b /><span className={step >= 3 ? "done" : ""}><i>3</i> Pay</span></div>
          {step === 1 ? (
            <div className="form-layout">
              <form className="paper-card form-card" onSubmit={submitRegistration}>
                <div className="card-title"><span><UserRound /></span><div><small>STEP 01</small><h2>Tell us who you are</h2></div></div>
                <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Kamau" /></label>
                <label>Safaricom M-Pesa number<div className="phone-input"><span>KE +254</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" /></div><small>We encrypt this and never display it publicly.</small></label>
                <label className="check-row"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /><span>I confirm that I am 18 or older.</span></label>
                <label className="check-row"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>I accept the pool rules: one entry, no refunds after close, and pooled payouts.</span></label>
                {formError && <div className="form-error"><CircleAlert /> {formError}</div>}
                <button className="primary-button full" type="submit">Continue to teams <ArrowRight /></button>
              </form>
              <aside className="rules-card"><ShieldCheck /><h3>Your details stay private</h3><p>Only the organiser can see your number. Public pool totals and chat use first names only.</p><hr /><h4>Quick rules</h4><ul><li>One confirmed entry per phone</li><li>KES 100 fixed stake</li><li>Entries close at kickoff</li><li>Manual payout after review</li></ul></aside>
            </div>
          ) : (
            <div className="form-layout">
              <form className="paper-card form-card" onSubmit={submitPayment}>
                <div className="card-title"><span><Trophy /></span><div><small>STEPS 02 + 03</small><h2>Pick, pay, submit</h2></div></div>
                <div className="mini-team-grid">
                  {teams.map((team) => <button type="button" key={team.id} className={selected === team.id ? "mini-team selected" : "mini-team"} onClick={() => setSelected(team.id)} style={{ "--team": team.color } as React.CSSProperties}><span>{team.id.toUpperCase()}</span><div><small>{team.route}</small><strong>{team.name}</strong></div>{selected === team.id && <BadgeCheck />}</button>)}
                </div>
                <div className="pay-instruction"><div><small>SEND EXACTLY</small><strong>KES 100</strong></div><ArrowRight /><div><small>M-PESA TILL</small><strong>555 019</strong></div></div>
                <label>M-Pesa confirmation code<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. SGQ4T2M8KU" maxLength={12} /><small>Paste the code from your M-Pesa confirmation message.</small></label>
                {formError && <div className="form-error"><CircleAlert /> {formError}</div>}
                <button className="primary-button full" type="submit">Submit for verification <ShieldCheck /></button>
                <button className="back-link" type="button" onClick={() => setStep(1)}>← Back to registration</button>
              </form>
              <aside className="rules-card amber"><Clock3 /><h3>Why verification?</h3><p>A submitted code starts as pending. The organiser matches it against M-Pesa before your stake is added to the live pot.</p><div className="status-flow"><span>Submitted</span><ArrowRight /><span>Checked</span><ArrowRight /><span>Confirmed</span></div></aside>
            </div>
          )}
        </section>
      )}

      {view === "receipt" && (
        <section className="app-page content-shell receipt-page">
          <div className="page-intro center"><div className="eyebrow dark">YOUR ENTRY</div><h1>{receipt ? "You're in the queue." : "No entry yet."}</h1><p>{receipt ? "Keep this receipt. We'll update the status when the organiser confirms payment." : "Register, choose a finalist, and submit your payment code first."}</p></div>
          {receipt ? <div className="receipt-card">
            <div className="receipt-head"><Mark /><div><strong>THE FINAL WHISTLE</strong><small>OFFICE POOL RECEIPT</small></div><span className={`status-pill ${receipt.status}`}><i /> {receipt.status}</span></div>
            <div className="receipt-team" style={{ "--team": teams.find((t) => t.id === receipt.team)?.color } as React.CSSProperties}><span>{receipt.team.toUpperCase()}</span><div><small>YOUR PICK</small><h2>{teamName(receipt.team)}</h2></div><Trophy /></div>
            <div className="receipt-details"><div><small>NAME</small><strong>{receipt.name}</strong></div><div><small>STAKE</small><strong>KES 100</strong></div><div><small>M-PESA CODE</small><strong>{receipt.code}</strong></div><div><small>SUBMITTED</small><strong>{receipt.time}</strong></div></div>
            <div className="receipt-note"><Clock3 /><span><strong>Awaiting organiser review.</strong> Pending entries are not counted in the live pool yet.</span></div>
            <button className="outline-button full" onClick={() => { navigator.clipboard?.writeText(`Final Whistle receipt · ${receipt.code}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy /> {copied ? "Copied" : "Copy receipt code"}</button>
          </div> : <button className="primary-button centered" onClick={() => navigate("play")}>Create my entry <ArrowRight /></button>}
        </section>
      )}

      {view === "chat" && (
        <section className="app-page content-shell chat-page">
          <div className="chat-header"><div><div className="eyebrow dark">THE OFFICE STANDS</div><h1>Match chat</h1><p>One room. First names only. Keep it friendly.</p></div><div className="online"><span /><strong>14 online</strong></div></div>
          <div className="chat-shell">
            <div className="chat-list">
              <div className="day-divider"><span>TODAY</span></div>
              {messages.map((item, index) => <div className="message-row" key={`${item.time}-${index}`}><span className={`avatar ${item.color}`}>{item.initials}</span><div><div className="message-meta"><strong>{item.name}</strong><small>{item.time}</small></div><p>{item.text}</p></div></div>)}
            </div>
            <form className="chat-compose" onSubmit={sendMessage}><span className="avatar green">{name ? name.slice(0, 2).toUpperCase() : "YO"}</span><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add to the office chat…" /><button aria-label="Send"><Send /></button></form>
          </div>
        </section>
      )}

      {view === "admin" && !adminUnlocked && (
        <section className="app-page content-shell admin-login">
          <div className="login-emblem"><LockKeyhole /></div><div className="eyebrow dark">ORGANISER ACCESS</div><h1>Admin room</h1><p>Review payments, edit the finalists, and safely settle the pool.</p>
          <form className="paper-card" onSubmit={loginAdmin}><label>Admin passcode<div className="password-input"><input type={showPasscode ? "text" : "password"} value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter passcode" /><button type="button" onClick={() => setShowPasscode(!showPasscode)}>{showPasscode ? <EyeOff /> : <Eye />}</button></div></label>{formError && <div className="form-error"><CircleAlert /> {formError}</div>}<button className="primary-button full">Unlock dashboard <ArrowRight /></button><small className="demo-hint">Preview passcode: FINAL26</small></form>
        </section>
      )}

      {view === "admin" && adminUnlocked && (
        <section className="admin-page">
          <aside className="admin-rail"><div className="admin-brand"><Mark small /><strong>FINAL<br />WHISTLE</strong></div><button className="selected"><LayoutDashboard /> Overview</button><button><UsersRound /> Entries</button><button><Banknote /> Payouts</button><button><MessageCircle /> Chat</button><span /><button onClick={() => setAdminUnlocked(false)}><LogOut /> Lock room</button></aside>
          <div className="admin-main">
            <div className="admin-heading"><div><small>THURSDAY, 16 JULY</small><h1>Good evening, organiser.</h1><p>Everything looks healthy. One payment needs your attention.</p></div><button className="outline-button" onClick={() => setEditingTeams(true)}><PencilLine /> Edit matchup</button></div>
            <div className="admin-stats"><div><span className="icon green"><UsersRound /></span><small>CONFIRMED</small><strong>{confirmed}</strong><em>+6 today</em></div><div><span className="icon blue"><Banknote /></span><small>TOTAL POOL</small><strong>{money.format(totalPool)}</strong><em>100% allocated</em></div><div><span className="icon amber"><Clock3 /></span><small>NEEDS REVIEW</small><strong>{registrations.filter((r) => r.status === "pending").length}</strong><em>Check M-Pesa</em></div><div><span className="icon coral"><Trophy /></span><small>TIME TO CLOSE</small><strong>{countdown.days}d {countdown.hours}h</strong><em>Automatic lock</em></div></div>
            <div className="admin-grid">
              <div className="admin-panel registrations"><div className="panel-heading"><div><h2>Recent entries</h2><p>Payment status and private reconciliation view.</p></div><button><MoreHorizontal /></button></div>
                <div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>PICK</th><th>M-PESA CODE</th><th>STATUS</th><th /></tr></thead><tbody>{registrations.map((item, index) => <tr key={`${item.code}-${index}`}><td><strong>{item.name}</strong><small>{item.phone} · {item.time}</small></td><td><span className={`pick-dot team-${item.team}`} /> {teamName(item.team)}</td><td>{item.code}</td><td><span className={`status-pill ${item.status}`}><i /> {item.status}</span></td><td>{item.status === "pending" ? <button className="confirm-btn" onClick={() => setRegistrations((items) => items.map((entry) => entry === item ? { ...entry, status: "confirmed" } : entry))}>Confirm</button> : <button className="dots"><MoreHorizontal /></button>}</td></tr>)}</tbody></table></div>
              </div>
              <div className="admin-panel settle-panel"><div className="panel-heading"><div><h2>Settle the final</h2><p>Only after the official result.</p></div><ShieldCheck /></div>{winner ? <div className="settled"><Crown /><h3>{teamName(winner)}</h3><p>Winner recorded. {money.format(totalPool / teams.find((t) => t.id === winner)!.backers)} per confirmed backer.</p></div> : <><div className="settle-warning"><CircleAlert /><span>This action calculates payouts and publishes the result to every participant.</span></div><small className="field-label">SELECT WINNING TEAM</small>{teams.map((team) => <button className="winner-choice" key={team.id} onClick={() => { setWinnerCandidate(team.id); setConfirmText(""); }}><span style={{ background: team.color }}>{team.id.toUpperCase()}</span><div><small>{team.route}</small><strong>{team.name}</strong></div><ArrowRight /></button>)}</>}</div>
            </div>
          </div>
        </section>
      )}

      {editingTeams && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setEditingTeams(false)}><X /></button><PencilLine className="modal-icon" /><h2>Edit the matchup</h2><p>Update these names once the finalists are official. Every participant view changes immediately.</p>{teams.map((team, index) => <label key={team.id}>Finalist {team.id.toUpperCase()}<input value={draftNames[index]} onChange={(e) => setDraftNames((current) => current.map((value, i) => i === index ? e.target.value : value))} /></label>)}<button className="primary-button full" onClick={saveTeams}>Save matchup <Check /></button></div></div>}
      {winnerCandidate && <div className="modal-backdrop"><div className="modal danger-modal"><button className="modal-close" onClick={() => setWinnerCandidate(null)}><X /></button><CircleAlert className="modal-icon" /><h2>Confirm the champion</h2><p>This publishes the result and calculates payouts. Type <strong>{teamName(winnerCandidate)}</strong> to continue.</p><label>Winning team<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={teamName(winnerCandidate)} /></label><button className="danger-button full" disabled={confirmText.trim().toLowerCase() !== teamName(winnerCandidate).toLowerCase()} onClick={markWinner}>Declare winner & calculate</button></div></div>}

      {view !== "admin" && <footer><div className="footer-brand"><Mark /><span><strong>THE FINAL</strong><small>WHISTLE</small></span></div><p>Built for colleagues, not the bookies. Play responsibly.</p><div><button>Pool rules</button><button>Privacy</button><span>© 2026</span></div></footer>}
    </main>
  );
}
