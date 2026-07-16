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
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminOverview, ApiError, BetReceipt, ChatItem, PoolState, VoteChoice, apiRequest } from "../lib/api";

type View = "home" | "play" | "chat" | "receipt" | "admin";
type AuthMode = "register" | "login";
type Team = { id: number; code: string; name: string; route: string; color: string; color2: string; backers: number; votes: number; amount: number };
type Registration = { id?: string; betId?: number; name: string; phone: string; team: number; code: string; status: BetReceipt["status"]; time: string };

const baseTeams: Team[] = [
  { id: 1, code: "A", name: "Finalist A", route: "Winner · Spain vs France", color: "#f35f44", color2: "#ffb45e", backers: 0, votes: 0, amount: 0 },
  { id: 2, code: "B", name: "Finalist B", route: "Winner · England vs Argentina", color: "#3568e8", color2: "#58c6ff", backers: 0, votes: 0, amount: 0 },
];

const seededRegistrations: Registration[] = [];

const seededMessages: Array<{ name: string; initials: string; text: string; time: string; color: string }> = [];

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const diff = now === null ? 0 : Math.max(0, new Date(target).getTime() - now);
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
  const [bettingClosesAt, setBettingClosesAt] = useState("2026-07-19T22:00:00+03:00");
  const countdown = useCountdown(bettingClosesAt);
  const [view, setView] = useState<View>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teams, setTeams] = useState(baseTeams);
  const [selected, setSelected] = useState<number | null>(null);
  const [savedVoteTeamId, setSavedVoteTeamId] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showParticipantPassword, setShowParticipantPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [voteNotice, setVoteNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiNotice, setApiNotice] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [receipt, setReceipt] = useState<Registration | null>(null);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState(seededMessages);
  const [message, setMessage] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminEmail, setAdminEmail] = useState("admin@example.com");
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [registrations, setRegistrations] = useState(seededRegistrations);
  const [winnerCandidate, setWinnerCandidate] = useState<number | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [editingTeams, setEditingTeams] = useState(false);
  const [draftNames, setDraftNames] = useState([teams[0].name, teams[1].name]);

  const refreshPool = useCallback(async () => {
    try {
      const state = await apiRequest<PoolState>("/pool");
      setPoolState(state);
      setBettingClosesAt(state.betting_closes_at);
      setTeams(state.teams.map((team) => ({ id: team.id, code: team.code, name: team.name, route: team.route || "Finalist", color: team.color, color2: team.color_secondary, backers: team.backers || 0, votes: team.votes || 0, amount: team.pooled || 0 })));
      setWinner(state.winner?.id || null);
      setApiNotice("");
    } catch (error) {
      setApiNotice(error instanceof Error ? error.message : "The live pool API is unavailable.");
    }
  }, []);

  const refreshReceipt = useCallback(async (token: string) => {
    const item = await apiRequest<BetReceipt | null>("/me/bet", {}, token);
    if (!item) return;
    setReceipt({ id: item.id, name: name || "Your entry", phone: "Private", team: item.team.id, code: item.mpesa_receipt_number || "Pending", status: item.status, time: item.confirmed_at ? new Date(item.confirmed_at).toLocaleString() : "Processing" });
  }, [name]);

  const refreshVote = useCallback(async (token: string) => {
    const vote = await apiRequest<VoteChoice | null>("/me/vote", {}, token);
    if (vote) {
      setSelected(vote.team.id);
      setSavedVoteTeamId(vote.team.id);
      setVoteNotice(`Your vote for ${vote.team.name} is saved.`);
    }
    return vote;
  }, []);

  const refreshChat = useCallback(async (token: string) => {
    const items = await apiRequest<ChatItem[]>("/chat", {}, token);
    setMessages(items.map((item, index) => ({ name: item.name.split(" ")[0], initials: item.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), text: item.message, time: new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: ["coral", "blue", "gold", "green"][index % 4] })));
  }, []);

  const loadAdmin = useCallback(async (token: string) => {
    const overview = await apiRequest<AdminOverview>("/admin/overview", {}, token);
    setRegistrations(overview.registrations.map((item) => ({ id: item.id, betId: item.bet?.id, name: item.name, phone: item.phone_number, team: item.bet?.team_id || 0, code: item.bet?.mpesa_receipt_number || "—", status: item.bet?.status || "pending", time: new Date(item.created_at).toLocaleString() })));
    setWinner(overview.settings.winner_team_id);
  }, []);

  useEffect(() => {
    const participant = localStorage.getItem("final-pool-token");
    const admin = sessionStorage.getItem("final-pool-admin-token");
    if (participant) {
      apiRequest<{ name: string }>("/auth/me", {}, participant)
        .then((profile) => { setAuthToken(participant); setName(profile.name); setStep(2); return Promise.all([refreshReceipt(participant), refreshVote(participant)]); })
        .catch(() => { localStorage.removeItem("final-pool-token"); setAuthToken(null); })
        .finally(() => setAuthReady(true));
    } else setAuthReady(true);
    if (admin) { setAdminToken(admin); setAdminUnlocked(true); loadAdmin(admin).catch(() => sessionStorage.removeItem("final-pool-admin-token")); }
    refreshPool();
  }, [loadAdmin, refreshPool, refreshReceipt, refreshVote]);

  useEffect(() => {
    if (!authToken || !receipt || !["pending", "processing"].includes(receipt.status)) return;
    const timer = setInterval(() => { refreshReceipt(authToken).then(refreshPool).catch(() => undefined); }, 4000);
    return () => clearInterval(timer);
  }, [authToken, receipt, refreshPool, refreshReceipt]);

  useEffect(() => {
    const timer = setInterval(refreshPool, 5000);
    return () => clearInterval(timer);
  }, [refreshPool]);

  const confirmed = poolState?.confirmed_entries || 0;
  const totalPool = poolState?.total_pool || 0;
  const teamTotals = useMemo(() => teams, [teams]);

  const navigate = (next: View) => {
    if (next === "play") setStep(authToken ? 2 : 1);
    setView(next);
    setMobileOpen(false);
    if (next === "chat" && authToken) refreshChat(authToken).catch(() => undefined);
    if (next === "admin" && adminToken) loadAdmin(adminToken).catch(() => undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const beginPick = (id: number) => {
    setSelected(id);
    setStep(authToken ? 2 : 1);
    navigate("play");
  };

  const submitRegistration = async (e: FormEvent) => {
    e.preventDefault();
    const valid = /^(07|01)\d{8}$/.test(phone.replace(/\s/g, ""));
    if (!name.trim() || !valid || password.length < 8 || password !== passwordConfirmation || !age || !terms) {
      setFormError("Add your details, use a matching password of at least 8 characters, and accept both checkboxes.");
      return;
    }
    setFormError(""); setBusy(true);
    try {
      const result = await apiRequest<{ token: string; participant: { name: string } }>("/auth/register", { method: "POST", body: JSON.stringify({ full_name: name.trim(), phone_number: phone.replace(/\s/g, ""), password, password_confirmation: passwordConfirmation, age_confirmed: age, terms_accepted: terms }) });
      localStorage.setItem("final-pool-token", result.token);
      setAuthToken(result.token); setAuthReady(true); setSavedVoteTeamId(null); setName(result.participant.name); setPassword(""); setPasswordConfirmation(""); setStep(2);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setAuthMode("login");
      setFormError(error instanceof ApiError ? error.message : "Registration failed.");
    }
    finally { setBusy(false); }
  };

  const loginParticipant = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) { setFormError("Enter your Safaricom number and password."); return; }
    setFormError(""); setBusy(true);
    try {
      const result = await apiRequest<{ token: string; participant: { name: string } }>("/auth/login", { method: "POST", body: JSON.stringify({ phone_number: phone, password }) });
      localStorage.setItem("final-pool-token", result.token);
      setAuthToken(result.token); setAuthReady(true); setName(result.participant.name); setPassword(""); setStep(2);
      await Promise.all([refreshReceipt(result.token), refreshVote(result.token)]);
    } catch (error) { setFormError(error instanceof ApiError ? error.message : "Sign in failed."); }
    finally { setBusy(false); }
  };

  const logoutParticipant = async () => {
    const token = authToken;
    localStorage.removeItem("final-pool-token");
    setAuthToken(null); setReceipt(null); setSelected(null); setSavedVoteTeamId(null); setVoteNotice(""); setName(""); setPhone(""); setPassword(""); setStep(1); setAuthMode("login");
    if (token) await apiRequest<void>("/auth/logout", { method: "POST" }, token).catch(() => undefined);
  };

  const submitVote = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !authToken) { setFormError("Choose a team before casting your vote."); return; }
    setBusy(true); setFormError(""); setVoteNotice("");
    try {
      const vote = await apiRequest<VoteChoice>("/vote", { method: "PUT", body: JSON.stringify({ team_id: selected }) }, authToken);
      setSelected(vote.team.id); setSavedVoteTeamId(vote.team.id); setVoteNotice(`Your vote for ${vote.team.name} is saved.`); setStep(2);
      await refreshPool();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Your vote could not be saved."); }
    finally { setBusy(false); }
  };

  const submitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !authToken) { setFormError("Register and choose a finalist before requesting payment."); return; }
    setBusy(true); setFormError("");
    try {
      await apiRequest<{ id: string; status: string; message: string }>("/bets", { method: "POST", body: JSON.stringify({ team_id: selected }) }, authToken);
      await refreshReceipt(authToken); await refreshPool(); navigate("receipt");
    } catch (error) { setFormError(error instanceof Error ? error.message : "The STK Push could not be started."); }
    finally { setBusy(false); }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !authToken) { setFormError("Register before joining the chat."); return; }
    try { await apiRequest<ChatItem>("/chat", { method: "POST", body: JSON.stringify({ message: message.trim() }) }, authToken); setMessage(""); await refreshChat(authToken); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Message failed."); }
  };

  const loginAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setFormError("");
    try {
      const result = await apiRequest<{ token: string }>("/admin/login", { method: "POST", body: JSON.stringify({ email: adminEmail, password: passcode }) });
      sessionStorage.setItem("final-pool-admin-token", result.token); setAdminToken(result.token); setAdminUnlocked(true); await loadAdmin(result.token);
    } catch (error) { setFormError(error instanceof Error ? error.message : "Admin login failed."); }
    finally { setBusy(false); }
  };

  const saveTeams = async () => {
    if (!adminToken) return;
    try { await apiRequest("/admin/teams", { method: "PUT", body: JSON.stringify({ teams: teams.map((team, index) => ({ id: team.id, name: draftNames[index].trim() || team.name, route: team.route })) }) }, adminToken); await refreshPool(); setEditingTeams(false); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Could not update teams."); }
  };

  const markWinner = async () => {
    if (!winnerCandidate) return;
    const candidate = teams.find((team) => team.id === winnerCandidate)!;
    if (confirmText.trim().toLowerCase() !== candidate.name.toLowerCase()) return;
    if (!adminToken) return;
    try { await apiRequest("/admin/settle", { method: "POST", body: JSON.stringify({ winner_team_id: winnerCandidate }) }, adminToken); setWinner(winnerCandidate); setWinnerCandidate(null); setConfirmText(""); await refreshPool(); await loadAdmin(adminToken); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Settlement failed."); }
  };

  const confirmBet = async (item: Registration) => {
    if (!adminToken || !item.betId) return;
    const receiptCode = window.prompt("Enter the M-Pesa receipt number you verified:");
    if (!receiptCode) return;
    try { await apiRequest(`/admin/bets/${item.betId}/confirm`, { method: "POST", body: JSON.stringify({ mpesa_receipt_number: receiptCode }) }, adminToken); await loadAdmin(adminToken); await refreshPool(); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Manual confirmation failed."); }
  };

  const teamName = (id: number) => teams.find((team) => team.id === id)?.name || `Team ${id}`;

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
          <button className={view === "play" ? "active" : ""} onClick={() => navigate("play")}>Vote & play</button>
          <button className={view === "chat" ? "active" : ""} onClick={() => navigate("chat")}>Chat {messages.length > 0 && <span className="nav-dot">{messages.length}</span>}</button>
          {receipt && <button className={view === "receipt" ? "active" : ""} onClick={() => navigate("receipt")}>My receipt</button>}
          <button className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}><LockKeyhole size={14} /> Admin</button>
        </nav>
        <div className="header-actions">
          <button className="outline-button" onClick={() => navigate(receipt ? "receipt" : "play")}><UserRound size={16} /> {receipt ? "My entry" : authToken ? "Continue entry" : "Join pool"}</button>
          {authToken && <button className="account-logout" aria-label="Sign out" title="Sign out" onClick={logoutParticipant}><LogOut size={17} /></button>}
          <button className="mobile-menu" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      {apiNotice && <div className="api-banner" role="status" aria-live="polite"><CircleAlert size={16} /><span>{apiNotice}</span><button onClick={refreshPool}>Retry</button></div>}

      {view === "home" && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="pulse" /> ENTRIES ARE OPEN</div>
              <h1>One match.<br /><em>One office.</em><br />All the bragging rights.</h1>
              <p>Pick the champion, back your call with KES 100, and share the pool if your side lifts the trophy.</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => navigate("play")}>Make your pick <ArrowRight size={18} /></button>
                <span className="micro-proof"><ShieldCheck size={18} /> Safaricom callback verified</span>
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
            <div className="match-center"><div className="versus-small"><strong>{teams[0].name}</strong><span>VS</span><strong>{teams[1].name}</strong></div><button onClick={() => navigate("play")}>View teams & vote <ArrowRight size={15} /></button></div>
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
                  <div className="team-crest">{team.code}<small>FINALIST</small></div>
                  <div className="team-info"><span>{team.route}</span><h3>{team.name}</h3></div>
                  <div className="team-stats"><div><strong>{team.votes}</strong><small>VOTES</small></div><div><strong>{money.format(team.amount)}</strong><small>STAKED</small></div></div>
                  <button onClick={() => beginPick(team.id)}>Back {team.name} <ArrowRight size={17} /></button>
                </article>
              ))}
            </div>
            <div className="share-bar"><span className="live-count-label"><i /> LIVE SUPPORTERS</span><div className="split-bar"><span style={{ width: `${teams[0].votes + teams[1].votes ? Math.round((teams[0].votes / (teams[0].votes + teams[1].votes)) * 100) : 50}%` }} /></div><span>{teams[0].votes + teams[1].votes ? `${Math.round((teams[0].votes / (teams[0].votes + teams[1].votes)) * 100)}% of voters chose ${teams[0].name}` : "Be the first to vote"}</span></div>
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
              <div><span>02</span><BadgeCheck /><h3>Cast your vote</h3><p>Choose the team you believe will win. You can change your vote until entries close.</p></div>
              <div><span>03</span><WalletCards /><h3>Back your call</h3><p>Send exactly KES 100 via M-Pesa to join the payout pool.</p></div>
            </div>
          </section>
        </>
      )}

      {view === "play" && (
        <section className="app-page content-shell">
          <div className="page-intro"><div className="eyebrow dark">YOUR ENTRY</div><h1>Make your call.</h1><p>Registration takes a minute. Your pick only counts after Safaricom confirms the M-Pesa payment.</p></div>
          <div className="stepper"><span className={step >= 1 ? "done" : ""}><i>{step > 1 ? <Check /> : "1"}</i> Register</span><b /><span className={step >= 2 ? "done" : ""}><i>{step > 2 ? <Check /> : "2"}</i> Vote</span><b /><span className={step >= 3 ? "done" : ""}><i>3</i> Pay</span></div>
          {!authReady ? (
            <div className="paper-card auth-loading" role="status">Checking your account…</div>
          ) : !authToken ? (
            <div className="form-layout">
              <form className="paper-card form-card" onSubmit={authMode === "register" ? submitRegistration : loginParticipant}>
                <div className="auth-switch" aria-label="Account access"><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setFormError(""); }}>Create account</button><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setFormError(""); }}>Sign in</button></div>
                <div className="card-title"><span><UserRound /></span><div><small>STEP 01</small><h2>{authMode === "register" ? "Tell us who you are" : "Welcome back"}</h2></div></div>
                {authMode === "register" && <label>Full name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Kamau" /></label>}
                <label>Safaricom M-Pesa number<div className="phone-input"><span>KE +254</span><input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" /></div><small>We encrypt this and never display it publicly.</small></label>
                <label>Password<div className="password-input"><input type={showParticipantPassword ? "text" : "password"} autoComplete={authMode === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={authMode === "register" ? "At least 8 characters" : "Your password"} /><button type="button" aria-label={showParticipantPassword ? "Hide password" : "Show password"} onClick={() => setShowParticipantPassword(!showParticipantPassword)}>{showParticipantPassword ? <EyeOff /> : <Eye />}</button></div></label>
                {authMode === "register" && <><label>Confirm password<input type={showParticipantPassword ? "text" : "password"} autoComplete="new-password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="Repeat your password" /></label><label className="check-row"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /><span>I confirm that I am 18 or older.</span></label><label className="check-row"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>I accept the pool rules: one entry, no refunds after close, and pooled payouts.</span></label></>}
                {formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}
                <button className="primary-button full" type="submit" disabled={busy}>{busy ? authMode === "register" ? "Creating account…" : "Signing in…" : authMode === "register" ? "Create account & continue" : "Sign in & continue"} <ArrowRight /></button>
              </form>
              <aside className="rules-card"><ShieldCheck /><h3>{authMode === "register" ? "Your details stay private" : "Pick up where you left off"}</h3><p>{authMode === "register" ? "Only the organiser can see your number. Public pool totals and chat use first names only." : "Sign in from any device to see your existing pick, payment status, and receipt."}</p><hr /><h4>Quick rules</h4><ul><li>One confirmed entry per phone</li><li>KES 100 fixed stake</li><li>Entries close at kickoff</li><li>Manual payout after review</li></ul></aside>
            </div>
          ) : step === 2 ? (
            <div className="form-layout">
              <form className="paper-card form-card" onSubmit={submitVote}>
                <div className="card-title"><span><BadgeCheck /></span><div><small>STEP 02</small><h2>Vote for the winner</h2></div></div>
                <p className="form-lead">Choose one team. Your vote is saved immediately and can be changed until the pool closes.</p>
                <div className="mini-team-grid">
                  {teams.map((team) => <button type="button" key={team.id} className={selected === team.id ? "mini-team selected" : "mini-team"} onClick={() => { setSelected(team.id); setVoteNotice(""); setFormError(""); }} style={{ "--team": team.color } as React.CSSProperties}><span>{team.code}</span><div><small>{team.route}</small><strong>{team.name}</strong><em>{team.votes} supporter{team.votes === 1 ? "" : "s"} · live</em></div>{selected === team.id && <BadgeCheck />}</button>)}
                </div>
                {voteNotice && <div className="vote-success" role="status"><BadgeCheck /><span>{voteNotice} You have one vote in this match.</span></div>}
                {formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}
                <button className="primary-button full" type="submit" disabled={busy || !selected || (!!selected && savedVoteTeamId === selected)}>{busy ? "Saving vote…" : selected && savedVoteTeamId === selected ? "Vote saved" : selected ? `Vote for ${teamName(selected)}` : "Choose a team"} <BadgeCheck /></button>
                {!!selected && savedVoteTeamId === selected && <button className="outline-button full continue-payment" type="button" onClick={() => setStep(3)}>Continue to optional payment <ArrowRight /></button>}
              </form>
              <aside className="rules-card"><Trophy /><h3>Your vote, your call</h3><p>Voting records your prediction. Payment is a separate optional step that makes the prediction eligible for the prize pool.</p></aside>
            </div>
          ) : (
            <div className="form-layout">
              <form className="paper-card form-card" onSubmit={submitPayment}>
                <div className="card-title"><span><WalletCards /></span><div><small>STEP 03</small><h2>Back your vote</h2></div></div>
                {voteNotice && <div className="vote-success"><BadgeCheck /><span>{voteNotice}</span></div>}
                <div className="selected-vote"><span style={{ background: teams.find((team) => team.id === selected)?.color }}>{teams.find((team) => team.id === selected)?.code}</span><div><small>YOUR VOTE</small><strong>{selected ? teamName(selected) : "No team selected"}</strong></div><button type="button" onClick={() => setStep(2)}>Change vote</button></div>
                <div className="pay-instruction"><div><small>PAY EXACTLY</small><strong>{money.format(poolState?.entry_fee || 100)}</strong></div><ArrowRight /><div><small>ON YOUR PHONE</small><strong>STK PUSH</strong></div></div>
                <div className="stk-explainer"><ShieldCheck /><span><strong>Safaricom confirms the payment.</strong> Keep your phone nearby, enter your M-Pesa PIN on the secure prompt, and wait for this page to update.</span></div>
                {formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}
                <button className="primary-button full" type="submit" disabled={busy}>{busy ? "Sending prompt…" : "Send M-Pesa prompt"} <ShieldCheck /></button>
              </form>
              <aside className="rules-card amber"><Clock3 /><h3>Callback verified</h3><p>Your bet starts as processing. Only Safaricom's server callback can add it to the live pot; clicking the button never counts as payment.</p><div className="status-flow"><span>Prompt</span><ArrowRight /><span>Callback</span><ArrowRight /><span>Confirmed</span></div></aside>
            </div>
          )}
        </section>
      )}

      {view === "receipt" && (
        <section className="app-page content-shell receipt-page">
          <div className="page-intro center"><div className="eyebrow dark">YOUR ENTRY</div><h1>{receipt?.status === "confirmed" ? "Your bet is confirmed." : receipt && ["failed", "cancelled", "timeout"].includes(receipt.status) ? "Payment was not confirmed." : receipt ? "Payment is processing." : "No entry yet."}</h1><p>{receipt ? "This page checks the callback automatically. A failed, cancelled, or timed-out prompt can be retried from Place a bet." : "Register, choose a finalist, and approve the M-Pesa prompt first."}</p></div>
          {receipt ? <div className="receipt-card">
            <div className="receipt-head"><Mark /><div><strong>THE FINAL WHISTLE</strong><small>OFFICE POOL RECEIPT</small></div><span className={`status-pill ${receipt.status}`}><i /> {receipt.status}</span></div>
            <div className="receipt-team" style={{ "--team": teams.find((t) => t.id === receipt.team)?.color } as React.CSSProperties}><span>{teams.find((t) => t.id === receipt.team)?.code || "?"}</span><div><small>YOUR PICK</small><h2>{teamName(receipt.team)}</h2></div><Trophy /></div>
            <div className="receipt-details"><div><small>NAME</small><strong>{receipt.name}</strong></div><div><small>STAKE</small><strong>{money.format(poolState?.entry_fee || 100)}</strong></div><div><small>M-PESA RECEIPT</small><strong>{receipt.code}</strong></div><div><small>STATUS UPDATED</small><strong>{receipt.time}</strong></div></div>
            <div className="receipt-note"><Clock3 /><span><strong>{receipt.status === "confirmed" ? "Safaricom confirmed your payment." : ["failed", "cancelled", "timeout"].includes(receipt.status) ? "This payment did not complete." : "Waiting for Safaricom."}</strong> {receipt.status === "confirmed" ? "Your stake is included in the live pool." : ["failed", "cancelled", "timeout"].includes(receipt.status) ? "No money has been added to the pool. Return to Place a bet to try again." : "Processing entries are not counted in the live pool yet."}</span></div>
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
          <form className="paper-card" onSubmit={loginAdmin}><label>Admin email<input type="email" autoComplete="username" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" /></label><label>Admin password<div className="password-input"><input type={showPasscode ? "text" : "password"} autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter password" /><button type="button" aria-label={showPasscode ? "Hide password" : "Show password"} onClick={() => setShowPasscode(!showPasscode)}>{showPasscode ? <EyeOff /> : <Eye />}</button></div></label>{formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}<button className="primary-button full" disabled={busy}>{busy ? "Checking…" : "Unlock dashboard"} <ArrowRight /></button></form>
        </section>
      )}

      {view === "admin" && adminUnlocked && (
        <section className="admin-page">
          <aside className="admin-rail"><div className="admin-brand"><Mark small /><strong>FINAL<br />WHISTLE</strong></div><button className="selected"><LayoutDashboard /> Overview</button><button><UsersRound /> Entries</button><button><Banknote /> Payouts</button><button><MessageCircle /> Chat</button><span /><button onClick={() => { sessionStorage.removeItem("final-pool-admin-token"); setAdminToken(null); setAdminUnlocked(false); }}><LogOut /> Lock room</button></aside>
          <div className="admin-main">
            <div className="admin-heading"><div><small>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</small><h1>Organiser dashboard.</h1><p>Live registrations, callback statuses, and settlement controls.</p></div><button className="outline-button" onClick={() => setEditingTeams(true)}><PencilLine /> Edit matchup</button></div>
            <div className="admin-stats"><div><span className="icon green"><UsersRound /></span><small>CONFIRMED</small><strong>{confirmed}</strong><em>Callback verified</em></div><div><span className="icon blue"><Banknote /></span><small>TOTAL POOL</small><strong>{money.format(totalPool)}</strong><em>Confirmed only</em></div><div><span className="icon amber"><Clock3 /></span><small>NEEDS REVIEW</small><strong>{registrations.filter((r) => r.status !== "confirmed").length}</strong><em>Reconcile carefully</em></div><div><span className="icon coral"><Trophy /></span><small>TIME TO CLOSE</small><strong>{countdown.days}d {countdown.hours}h</strong><em>Automatic lock</em></div></div>
            <div className="admin-grid">
              <div className="admin-panel registrations"><div className="panel-heading"><div><h2>Recent entries</h2><p>Payment status and private reconciliation view.</p></div><button><MoreHorizontal /></button></div>
                <div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>PICK</th><th>M-PESA CODE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{registrations.map((item, index) => <tr key={`${item.id}-${index}`}><td><strong>{item.name}</strong><small>{item.phone} · {item.time}</small></td><td><span className={`pick-dot team-${teams.find((team) => team.id === item.team)?.code.toLowerCase() || "none"}`} /> {item.team ? teamName(item.team) : "No pick"}</td><td>{item.code}</td><td><span className={`status-pill ${item.status}`}><i /> {item.status}</span></td><td>{item.betId && item.status !== "confirmed" ? <button className="confirm-btn" onClick={() => confirmBet(item)}>Confirm</button> : <span className="dots" aria-label="No action available"><MoreHorizontal /></span>}</td></tr>)}</tbody></table></div>
              </div>
              <div className="admin-panel settle-panel"><div className="panel-heading"><div><h2>Settle the final</h2><p>Only after the official result.</p></div><ShieldCheck /></div>{winner ? <div className="settled"><Crown /><h3>{teamName(winner)}</h3><p>Winner recorded. The server generated the reviewed payout list.</p></div> : <><div className="settle-warning"><CircleAlert /><span>This action calculates payouts and publishes the result to every participant.</span></div><small className="field-label">SELECT WINNING TEAM</small>{teams.map((team) => <button className="winner-choice" key={team.id} onClick={() => { setWinnerCandidate(team.id); setConfirmText(""); }}><span style={{ background: team.color }}>{team.code}</span><div><small>{team.route}</small><strong>{team.name}</strong></div><ArrowRight /></button>)}</>}</div>
            </div>
          </div>
        </section>
      )}

      {editingTeams && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-matchup-title"><button className="modal-close" aria-label="Close edit matchup dialog" onClick={() => setEditingTeams(false)}><X /></button><PencilLine className="modal-icon" /><h2 id="edit-matchup-title">Edit the matchup</h2><p>Update these names once the finalists are official. Every participant view changes immediately.</p>{teams.map((team, index) => <label key={team.id}>Finalist {team.code}<input value={draftNames[index]} onChange={(e) => setDraftNames((current) => current.map((value, i) => i === index ? e.target.value : value))} /></label>)}<button className="primary-button full" onClick={saveTeams}>Save matchup <Check /></button></div></div>}
      {winnerCandidate && <div className="modal-backdrop"><div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-champion-title"><button className="modal-close" aria-label="Close winner confirmation dialog" onClick={() => setWinnerCandidate(null)}><X /></button><CircleAlert className="modal-icon" /><h2 id="confirm-champion-title">Confirm the champion</h2><p>This publishes the result and calculates payouts. Type <strong>{teamName(winnerCandidate)}</strong> to continue.</p><label>Winning team<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={teamName(winnerCandidate)} /></label><button className="danger-button full" disabled={confirmText.trim().toLowerCase() !== teamName(winnerCandidate).toLowerCase()} onClick={markWinner}>Declare winner & calculate</button></div></div>}

      {view !== "admin" && <footer><div className="footer-brand"><Mark /><span><strong>THE FINAL</strong><small>WHISTLE</small></span></div><p>Built for colleagues, not the bookies. Play responsibly.</p><div><button>Pool rules</button><button>Privacy</button><span>© 2026</span></div></footer>}
    </main>
  );
}
