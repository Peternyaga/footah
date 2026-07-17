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
import { AdminOverview, ApiError, ApiMatch, BetReceipt, ChatItem, PoolState, VoteChoice, apiRequest } from "../lib/api";
import { assetPath } from "../lib/assets";

type View = "home" | "play" | "chat" | "receipt" | "admin";
type AuthMode = "register" | "login";
type Team = { id: number; code: string; name: string; route: string; color: string; color2: string; backers: number; votes: number; amount: number; image: string; flag: string; player: string };
type Registration = { id?: string; betId?: number; name: string; phone: string; team: number; code: string; status: BetReceipt["status"]; time: string };

const baseTeams: Team[] = [
  { id: 1, code: "ARG", name: "Argentina", route: "Finalist · Messi leads the holders", color: "#74c7f5", color2: "#ffffff", backers: 0, votes: 0, amount: 0, image: assetPath("/assets/images/argentina-lionel-messi.jpg"), flag: "🇦🇷", player: "Lionel Messi" },
  { id: 2, code: "ESP", name: "Spain", route: "Finalist · Lamine Yamal's Roja", color: "#d61920", color2: "#ffd43b", backers: 0, votes: 0, amount: 0, image: assetPath("/assets/images/spain-lamine-yamal.jpg"), flag: "🇪🇸", player: "Lamine Yamal" },
];

const seededRegistrations: Registration[] = [];

const seededMessages: Array<{ name: string; initials: string; text: string; time: string; color: string }> = [];

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

function teamVisual(team: { id: number; code: string; name: string }, index = 0) {
  const identity = `${team.code} ${team.name}`.toLowerCase();
  const isSpain = identity.includes("spain") || identity.includes("esp") || team.code === "B" || index === 1;
  return isSpain ? baseTeams[1] : baseTeams[0];
}

function presentTeam(team: { id: number; code: string; name: string; route: string | null; color: string; color_secondary: string; backers?: number; votes?: number; pooled?: number }, index = 0): Team {
  const visual = teamVisual(team, index);
  return {
    id: team.id,
    code: visual.code,
    name: visual.name,
    route: visual.route,
    color: visual.color,
    color2: visual.color2,
    backers: team.backers || 0,
    votes: team.votes || 0,
    amount: team.pooled || 0,
    image: visual.image,
    flag: visual.flag,
    player: visual.player,
  };
}

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
  return <span className={small ? "mark mark-small" : "mark"}><img src={assetPath("/assets/images/world-cup-trophy.jpg")} alt="" /></span>;
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
  const [adminMatches, setAdminMatches] = useState<ApiMatch[]>([]);
  const [adminTeams, setAdminTeams] = useState<Team[]>(baseTeams);
  const [adminSelectedMatchId, setAdminSelectedMatchId] = useState<number | null>(null);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [newMatchName, setNewMatchName] = useState("");
  const [newMatchClosesAt, setNewMatchClosesAt] = useState("");
  const [newMatchFee, setNewMatchFee] = useState("100");
  const [newTeamNames, setNewTeamNames] = useState(["", ""]);
  const [winnerCandidate, setWinnerCandidate] = useState<number | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [adminWinner, setAdminWinner] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [editingTeams, setEditingTeams] = useState(false);
  const [draftNames, setDraftNames] = useState([adminTeams[0].name, adminTeams[1].name]);

  const refreshPool = useCallback(async () => {
    try {
      const state = await apiRequest<PoolState>("/pool");
      setPoolState(state);
      setBettingClosesAt(state.betting_closes_at);
      setTeams(state.teams.map((team, index) => presentTeam(team, index)));
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

  const loadAdmin = useCallback(async (token: string, matchId?: number | null) => {
    const overview = await apiRequest<AdminOverview>(`/admin/overview${matchId ? `?match_id=${matchId}` : ""}`, {}, token);
    setAdminMatches(overview.matches);
    setAdminSelectedMatchId(overview.settings.id);
    setAdminTeams(overview.teams.map((team, index) => presentTeam(team, index)));
    setDraftNames(overview.teams.map((team) => team.name));
    setRegistrations(overview.registrations.map((item) => ({ id: item.id, betId: item.bet?.id, name: item.name, phone: item.phone_number, team: item.bet?.team_id || 0, code: item.bet?.mpesa_receipt_number || "—", status: item.bet?.status || "pending", time: new Date(item.created_at).toLocaleString() })));
    setAdminWinner(overview.settings.winner_team_id);
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
    try { await apiRequest("/admin/teams", { method: "PUT", body: JSON.stringify({ teams: adminTeams.map((team, index) => ({ id: team.id, name: draftNames[index].trim() || team.name, route: team.route })) }) }, adminToken); await loadAdmin(adminToken, adminSelectedMatchId); await refreshPool(); setEditingTeams(false); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Could not update teams."); }
  };

  const createMatch = async () => {
    if (!adminToken || !newMatchName.trim() || !newMatchClosesAt || newTeamNames.some((team) => !team.trim())) return;
    setBusy(true); setFormError("");
    try {
      const match = await apiRequest<ApiMatch>("/admin/matches", { method: "POST", body: JSON.stringify({ event_name: newMatchName.trim(), entry_fee: Number(newMatchFee), betting_closes_at: new Date(newMatchClosesAt).toISOString(), teams: newTeamNames.map((team) => ({ name: team.trim() })) }) }, adminToken);
      setCreatingMatch(false); setNewMatchName(""); setNewMatchClosesAt(""); setNewTeamNames(["", ""]);
      await loadAdmin(adminToken, match.id); await refreshPool();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not create the match."); }
    finally { setBusy(false); }
  };

  const setMatchStatus = async (status: "open" | "closed") => {
    if (!adminToken || !adminSelectedMatchId) return;
    setBusy(true); setFormError("");
    try { await apiRequest(`/admin/matches/${adminSelectedMatchId}`, { method: "PATCH", body: JSON.stringify({ status }) }, adminToken); await loadAdmin(adminToken, adminSelectedMatchId); await refreshPool(); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Could not update the match."); }
    finally { setBusy(false); }
  };

  const markWinner = async () => {
    if (!winnerCandidate) return;
    const candidate = adminTeams.find((team) => team.id === winnerCandidate)!;
    if (confirmText.trim().toLowerCase() !== candidate.name.toLowerCase()) return;
    if (!adminToken) return;
    try { await apiRequest("/admin/settle", { method: "POST", body: JSON.stringify({ winner_team_id: winnerCandidate }) }, adminToken); setAdminWinner(winnerCandidate); setWinnerCandidate(null); setConfirmText(""); await refreshPool(); await loadAdmin(adminToken, adminSelectedMatchId); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Settlement failed."); }
  };

  const confirmBet = async (item: Registration) => {
    if (!adminToken || !item.betId) return;
    const receiptCode = window.prompt("Enter the M-Pesa receipt number you verified:");
    if (!receiptCode) return;
    try { await apiRequest(`/admin/bets/${item.betId}/confirm`, { method: "POST", body: JSON.stringify({ mpesa_receipt_number: receiptCode }) }, adminToken); await loadAdmin(adminToken, adminSelectedMatchId); await refreshPool(); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Manual confirmation failed."); }
  };

  const teamName = (id: number) => teams.find((team) => team.id === id)?.name || `Team ${id}`;
  const adminTeamName = (id: number) => adminTeams.find((team) => team.id === id)?.name || `Team ${id}`;
  const selectedAdminMatch = adminMatches.find((match) => match.id === adminSelectedMatchId);

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
              <div className="eyebrow"><span className="pulse" /> ARGENTINA VS SPAIN</div>
              <h1>The king's last dance.<br /><em>The kid's first crown.</em><br />Choose your side.</h1>
              <p>Messi carries a lifetime of magic. Yamal arrives with tomorrow in his boots. One final, one office, one call.</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => navigate("play")}>Make your pick <ArrowRight size={18} /></button>
                <span className="micro-proof"><ShieldCheck size={18} /> Safaricom callback verified</span>
              </div>
            </div>
            <div className="hero-art" aria-label="FIFA World Cup trophy">
              <img className="hero-world-cup-image" src={assetPath("/assets/images/world-cup-trophy.jpg")} alt="FIFA World Cup trophy" />
              <div className="hero-photo-label"><small>FINAL NIGHT</small><strong>WORLD CUP 2026</strong></div>
            </div>
          </section>

          <section className="match-strip">
            <div className="match-meta"><CalendarDays size={18} /><span><small>{poolState?.event_name || "THE MATCH"}</small>{new Date(bettingClosesAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span></div>
            <div className="match-center"><div className="versus-small"><strong>{teams[0].name}</strong><span>VS</span><strong>{teams[1].name}</strong></div><button onClick={() => navigate("play")}>View teams & vote <ArrowRight size={15} /></button></div>
            <div className="match-meta right"><Clock3 size={18} /><span><small>VOTING CLOSES · EAT</small>{new Date(bettingClosesAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
          </section>

          <section className="content-shell pool-section">
            <div className="section-heading">
              <div><div className="eyebrow dark">THE OFFICE HAS SPOKEN</div><h2>Where the pool stands</h2></div>
              <div className="pool-total"><small>TOTAL POT</small><strong>{money.format(totalPool)}</strong><span>{confirmed} confirmed entries</span></div>
            </div>
            {winner && <div className="winner-banner"><Crown /> <span><strong>{teamName(winner)} are the champions.</strong> The payout list is ready for the organiser.</span></div>}
            <div className="team-grid">
              {teamTotals.map((team, index) => (
                <article className="team-card" key={team.id} style={{ "--team": team.color, "--team2": team.color2, "--team-image": `url(${team.image})` } as React.CSSProperties}>
                  <div className="team-wash" />
                  <div className="team-photo" aria-hidden="true" />
                  <div className="team-top"><span className="team-seed">0{index + 1}</span><span className="trend"><Flame size={14} /> {index === 0 ? "Leading" : "Underdog"}</span></div>
                  <div className="team-crest"><span>{team.flag}</span><small>{team.code}</small></div>
                  <div className="team-info"><span>{team.route}</span><h3>{team.name}</h3><em>{team.player}</em></div>
                  <div className="team-stats"><div><strong>{team.votes}</strong><small>VOTES</small></div><div><strong>{money.format(team.amount)}</strong><small>STAKED</small></div></div>
                  <button className="team-back-button" onClick={() => beginPick(team.id)}><span>{team.flag}</span> Back {team.name} <ArrowRight size={17} /></button>
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
                  {teams.map((team) => <button type="button" key={team.id} className={selected === team.id ? "mini-team selected" : "mini-team"} onClick={() => { setSelected(team.id); setVoteNotice(""); setFormError(""); }} style={{ "--team": team.color } as React.CSSProperties}><span>{team.flag}</span><div><small>{team.player} · {team.code}</small><strong>{team.name}</strong><em>{team.votes} supporter{team.votes === 1 ? "" : "s"} · live</em></div>{selected === team.id && <BadgeCheck />}</button>)}
                </div>
                {voteNotice && <div className="vote-success" role="status"><BadgeCheck /><span>{voteNotice} You have one vote in this match.</span></div>}
                {formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}
                <button className="primary-button full" type="submit" disabled={busy || !selected || (!!selected && savedVoteTeamId === selected)}>{busy ? "Saving vote…" : selected && savedVoteTeamId === selected ? "Vote saved" : selected ? `Vote for ${teamName(selected)}` : "Choose a team"} <BadgeCheck /></button>
                {!!selected && savedVoteTeamId === selected && <button className="outline-button full continue-payment" type="button" onClick={() => setStep(3)}>Continue to optional payment <ArrowRight /></button>}
              </form>
              <aside className="rules-card"><Mark small /><h3>Your vote, your call</h3><p>Voting records your prediction. Payment is a separate optional step that makes the prediction eligible for the prize pool.</p></aside>
            </div>
          ) : (
            <div className="form-layout">
              <form className="paper-card form-card" onSubmit={submitPayment}>
                <div className="card-title"><span><WalletCards /></span><div><small>STEP 03</small><h2>Back your vote</h2></div></div>
                {voteNotice && <div className="vote-success"><BadgeCheck /><span>{voteNotice}</span></div>}
                <div className="selected-vote"><span style={{ background: teams.find((team) => team.id === selected)?.color }}>{teams.find((team) => team.id === selected)?.flag}</span><div><small>YOUR VOTE</small><strong>{selected ? teamName(selected) : "No team selected"}</strong></div><button type="button" onClick={() => setStep(2)}>Change vote</button></div>
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
            <div className="receipt-team" style={{ "--team": teams.find((t) => t.id === receipt.team)?.color } as React.CSSProperties}><span>{teams.find((t) => t.id === receipt.team)?.flag || "?"}</span><div><small>YOUR PICK</small><h2>{teamName(receipt.team)}</h2></div><Mark small /></div>
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
            <div className="admin-heading"><div><small>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</small><h1>Organiser dashboard.</h1><p>Create matches, manage teams, close voting, and declare official winners.</p></div><div className="admin-heading-actions"><button className="outline-button" onClick={() => setEditingTeams(true)} disabled={!adminSelectedMatchId}><PencilLine /> Edit teams</button><button className="primary-button" onClick={() => setCreatingMatch(true)}>Add match <ArrowRight /></button></div></div>
            <div className="match-manager"><div><small>MANAGED MATCH</small><select value={adminSelectedMatchId || ""} onChange={(e) => adminToken && loadAdmin(adminToken, Number(e.target.value))}>{adminMatches.map((match) => <option value={match.id} key={match.id}>{match.event_name} · {match.status}</option>)}</select></div><div className={`match-status ${selectedAdminMatch?.status || "closed"}`}><i /> {selectedAdminMatch?.status || "closed"}</div><div className="match-manager-actions">{selectedAdminMatch?.status !== "settled" && (selectedAdminMatch?.status === "open" ? <button className="danger-button" onClick={() => setMatchStatus("closed")} disabled={busy}>Close match</button> : <button className="outline-button" onClick={() => setMatchStatus("open")} disabled={busy}>Reopen match</button>)}</div></div>
            {formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}
            <div className="admin-stats"><div><span className="icon green"><UsersRound /></span><small>CONFIRMED</small><strong>{registrations.filter((r) => r.status === "confirmed").length}</strong><em>Callback verified</em></div><div><span className="icon blue"><Banknote /></span><small>TOTAL POOL</small><strong>{money.format(registrations.filter((r) => r.status === "confirmed").reduce((sum, item) => sum + (item.betId ? Number(selectedAdminMatch?.entry_fee || 0) : 0), 0))}</strong><em>This match</em></div><div><span className="icon amber"><Clock3 /></span><small>NEEDS REVIEW</small><strong>{registrations.filter((r) => r.betId && r.status !== "confirmed").length}</strong><em>Reconcile carefully</em></div><div><span className="icon coral"><Mark small /></span><small>STATUS</small><strong>{selectedAdminMatch?.status.toUpperCase() || "—"}</strong><em>{selectedAdminMatch ? new Date(selectedAdminMatch.betting_closes_at).toLocaleString() : "No match"}</em></div></div>
            <div className="admin-grid">
              <div className="admin-panel registrations"><div className="panel-heading"><div><h2>Recent entries</h2><p>Payment status and private reconciliation view.</p></div><button><MoreHorizontal /></button></div>
                <div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>PICK</th><th>M-PESA CODE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{registrations.map((item, index) => <tr key={`${item.id}-${index}`}><td><strong>{item.name}</strong><small>{item.phone} · {item.time}</small></td><td><span className={`pick-dot team-${adminTeams.find((team) => team.id === item.team)?.code.toLowerCase() || "none"}`} /> {item.team ? adminTeamName(item.team) : "No pick"}</td><td>{item.code}</td><td><span className={`status-pill ${item.status}`}><i /> {item.status}</span></td><td>{item.betId && item.status !== "confirmed" ? <button className="confirm-btn" onClick={() => confirmBet(item)}>Confirm</button> : <span className="dots" aria-label="No action available"><MoreHorizontal /></span>}</td></tr>)}</tbody></table></div>
              </div>
              <div className="admin-panel settle-panel"><div className="panel-heading"><div><h2>Declare winner</h2><p>{selectedAdminMatch?.event_name || "Select a match"}</p></div><ShieldCheck /></div>{adminWinner ? <div className="settled"><Crown /><h3>{adminTeamName(adminWinner)}</h3><p>Winner recorded. The server generated the reviewed payout list.</p></div> : <><div className="settle-warning"><CircleAlert /><span>This action calculates payouts and publishes the result to every participant.</span></div><small className="field-label">SELECT WINNING TEAM</small>{adminTeams.map((team) => <button className="winner-choice" key={team.id} onClick={() => { setWinnerCandidate(team.id); setConfirmText(""); }}><span style={{ background: team.color }}>{team.code}</span><div><small>{team.route}</small><strong>{team.name}</strong></div><ArrowRight /></button>)}</>}</div>
            </div>
          </div>
        </section>
      )}

      {editingTeams && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-matchup-title"><button className="modal-close" aria-label="Close edit matchup dialog" onClick={() => setEditingTeams(false)}><X /></button><PencilLine className="modal-icon" /><h2 id="edit-matchup-title">Edit the teams</h2><p>Update the teams for {selectedAdminMatch?.event_name}. Participant views change immediately.</p>{adminTeams.map((team, index) => <label key={team.id}>Team {index + 1}<input value={draftNames[index] || ""} onChange={(e) => setDraftNames((current) => current.map((value, i) => i === index ? e.target.value : value))} /></label>)}<button className="primary-button full" onClick={saveTeams}>Save teams <Check /></button></div></div>}
      {creatingMatch && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-match-title"><button className="modal-close" aria-label="Close create match dialog" onClick={() => setCreatingMatch(false)}><X /></button><Trophy className="modal-icon" /><h2 id="create-match-title">Add a match</h2><p>Create the fixture and its two teams. It becomes the active public match immediately.</p><label>Match name<input value={newMatchName} onChange={(e) => setNewMatchName(e.target.value)} placeholder="e.g. Semi-final: Kenya vs Ghana" /></label><label>Voting closes<input type="datetime-local" value={newMatchClosesAt} onChange={(e) => setNewMatchClosesAt(e.target.value)} /></label><label>Entry fee (KES)<input type="number" min="1" value={newMatchFee} onChange={(e) => setNewMatchFee(e.target.value)} /></label>{newTeamNames.map((team, index) => <label key={index}>Team {index + 1}<input value={team} onChange={(e) => setNewTeamNames((current) => current.map((value, i) => i === index ? e.target.value : value))} placeholder={index === 0 ? "Home team" : "Away team"} /></label>)}{formError && <div className="form-error" role="alert"><CircleAlert /> {formError}</div>}<button className="primary-button full" disabled={busy || !newMatchName.trim() || !newMatchClosesAt || newTeamNames.some((team) => !team.trim())} onClick={createMatch}>{busy ? "Creating…" : "Create match"} <Check /></button></div></div>}
      {winnerCandidate && <div className="modal-backdrop"><div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-champion-title"><button className="modal-close" aria-label="Close winner confirmation dialog" onClick={() => setWinnerCandidate(null)}><X /></button><CircleAlert className="modal-icon" /><h2 id="confirm-champion-title">Confirm the champion</h2><p>This publishes the result and calculates payouts. Type <strong>{adminTeamName(winnerCandidate)}</strong> to continue.</p><label>Winning team<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={adminTeamName(winnerCandidate)} /></label><button className="danger-button full" disabled={confirmText.trim().toLowerCase() !== adminTeamName(winnerCandidate).toLowerCase()} onClick={markWinner}>Declare winner & calculate</button></div></div>}

      {view !== "admin" && <footer><div className="footer-brand"><Mark /><span><strong>THE FINAL</strong><small>WHISTLE</small></span></div><p>Built for colleagues, not the bookies. Play responsibly.</p><div><button>Pool rules</button><button>Privacy</button><span>© 2026</span></div></footer>}
    </main>
  );
}
