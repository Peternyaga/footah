export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly errors?: Record<string, string[]>) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.message || "The server could not complete the request.", response.status, payload.errors);
  return payload.data as T;
}

export type ApiTeam = {
  id: number;
  code: string;
  name: string;
  route: string | null;
  color: string;
  color_secondary: string;
  backers?: number;
  pooled?: number;
};

export type PoolState = {
  event_name: string;
  entry_fee: number;
  betting_closes_at: string;
  status: "open" | "closed" | "postponed" | "settled";
  cost_deduction: number;
  total_pool: number;
  confirmed_entries: number;
  winner: ApiTeam | null;
  postponement_notice: string | null;
  teams: ApiTeam[];
};

export type BetReceipt = {
  id: string;
  team: ApiTeam;
  amount: number;
  status: "pending" | "processing" | "confirmed" | "failed" | "cancelled" | "timeout";
  mpesa_receipt_number: string | null;
  result_description: string | null;
  initiated_at: string | null;
  confirmed_at: string | null;
  payout: number | null;
  fellow_winners: string[];
};

export type ChatItem = { id: number; name: string; message: string; created_at: string };

export type AdminOverview = {
  settings: { status: string; winner_team_id: number | null; cost_deduction: number };
  teams: ApiTeam[];
  registrations: Array<{
    id: string;
    name: string;
    phone_number: string;
    created_at: string;
    bet: null | {
      id: number;
      public_id: string;
      team: string;
      team_id: number;
      amount: number;
      status: BetReceipt["status"];
      mpesa_receipt_number: string | null;
      result_description: string | null;
      payout: number | null;
    };
  }>;
};
