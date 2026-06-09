import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripIds(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripIds);
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id' || k.endsWith('Id') || k.endsWith('_id')) continue;
    if (typeof v === 'string' && UUID_RE.test(v)) continue;
    result[k] = stripIds(v);
  }
  return result;
}

const SYSTEM_PROMPT = `You are a helpful assistant for a referee match manager app. Help users with their data.

IMPORTANT: Never use <function> tags, <think> tags, or any XML-like syntax.
IMPORTANT: Never include any IDs or UUIDs in your response text. Use team names and player names instead.
IMPORTANT: No markdown, no asterisks, no bullet symbols, no special characters. Use plain text only.
IMPORTANT: If the user asks to do something but doesn't provide all required info, ask them for the missing details before calling a tool.

IMPORTANT: NEVER guess or fabricate match IDs under any circumstances. Match IDs are UUIDs like "c1e9a36a-1021-40bb-b5be-3a2b83766bde". You MUST always call getMatches or getUpcomingMatches first to find the real match ID, then use that real ID in your tool call. NEVER use made-up IDs like "spartak-fratriq-2023-06-11" or "fratriq-topoli-2023-06-11". If you don't know the match ID, call getMatches to find it. If you can't find the match, tell the user you couldn't find it.

IMPORTANT: When the user says a team name like "Spartak U14" or "Fratriq U14", the "U14" part is the division, not the team name. Use getTeams to find the team (e.g. "Spartak"), then set homeDivision/awayDivision to "U14" in addMatch. The team's name in the database is just "Spartak", and the division is a separate field.

When presenting data, use this exact format with each item on its own line:

Standings format:
1. Fratriq
   Played: 2 | W: 2 | D: 0 | L: 0 | GF: 5 | GA: 1 | GD: +4 | Pts: 6

2. Spartak
   Played: 2 | W: 1 | D: 0 | L: 1 | GF: 3 | GA: 2 | GD: +1 | Pts: 3

Match format:
Fratriq vs Spartak
Date: Sat, Jun 10, 18:00
Location: Stadium
Division: U14
Status: scheduled

Team format:
Fratriq
Category: Football
Divisions: U14, U15-A

Match states:
- "incomplete" = status is "scheduled" or "cancelled" (not yet played/finished)
- "completed" = status is "completed" (match was played)
- "completed with report" = status is "completed" AND has a result (scores logged)
- "completed without report" = status is "completed" AND has no result (no scores yet)

When the user asks for data, respond with a plain JSON object on its own line like this:
{"tool": "getMatches", "args": {"status": "scheduled"}}

Available tools:
- getMatches: args = { status?: "scheduled"|"completed"|"cancelled", incomplete?: boolean, hasReport?: boolean, hasReferees?: boolean, teamId?: string, limit?: number }
  - Set incomplete:true to get matches that are NOT completed (scheduled/cancelled).
  - Set hasReport:true to get completed matches that have a result.
  - Set hasReport:false to get completed matches missing a report.
  - Set hasReferees:false to get matches with no referees assigned.
  - Set hasReferees:true to get matches that have at least one referee.
- getUpcomingMatches: args = {}
- getTeams: args = {}
- getUsersByRole: args = { role: "admin"|"referee"|"coach"|"player" }
- getNotifications: args = { limit?: number }
- getMatchDetails: args = { matchId: string }
- getPendingAssignments: args = {}
  Returns matches where the current user is assigned as referee with pending status.
- getStandings: args = { division?: string, limit?: number }
  Calculates league standings from completed matches. Returns teams sorted by points (win=3, draw=1, loss=0). Use division to filter by league like "U14", "U15-A", etc.
- getTopScorers: args = { limit?: number }
  Returns the top goal scorers across all completed matches, sorted by goals scored.
  Returns an array of { scorer: string, goals: number, team: string }.
- respondToMatch: args = { matchId: string, status: "accepted"|"declined" }
  Accepts or declines a referee assignment. Confirm before responding.
- assignReferee: args = { matchId: string, refereeId: string, role: "chief"|"assistant1"|"assistant2" }
  Assigns a referee to a match. Use getUsersByRole("referee") first to list available referees.
- addMatch: args = { homeTeamId: string, awayTeamId: string, homeTeamName: string, awayTeamName: string, homeDivision: string, awayDivision: string, dateTime: string, location?: string, category?: string }
  Creates a new match. Required: homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeDivision, awayDivision, dateTime (ISO string).
- addTeam: args = { name: string, category?: string, divisions?: string[], coachId?: string }
  Creates a new team.
- addPlayer: args = { name: string, birthDate: string, jerseyNumber: number, teamId: string, position?: string }
  Creates a new player.
- completeMatch: args = { matchId: string, result?: { homeScore: number, awayScore: number }, comments?: string }
  Marks a match as completed with optional score and comments.
- sendReport: args = { matchId: string, result: { homeScore: number, awayScore: number }, comments?: string }
  Adds or updates the result and comments on a match. The match must be completed first.
- viewLineup: args = { matchId: string }
  Shows the submitted lineup/roster of players for a match.
- submitLineup: args = { matchId: string, starting: string[], substitutes: string[] }
  Submits a team lineup with starting players and substitutes (list of player IDs).
- markAllAsRead: args = {}
  Marks all of the current user's notifications as read.
- updateSettings: args = { theme?: "light"|"dark", name?: string, nickname?: string }
  Updates the current user's profile settings. Confirm before updating.

Summarize results cleanly using the format examples above. Never include raw JSON, IDs, or technical database fields. Use team and player names, not IDs.

For updateSettings, addTeam, addPlayer, addMatch, assignReferee, respondToMatch, completeMatch, and sendReport: always ask the user to confirm before making any changes. If they don't provide all required fields, ask for the missing info first. Then call the tool and confirm it's done.`;

async function callTool(name: string, args: any, supabase: any) {
  switch (name) {
    case "getMatches": {
      let q = supabase.from("matches").select("*").order("date_time", { ascending: false });
      if (args.status) q = q.eq("status", args.status);
      if (args.incomplete) q = q.neq("status", "completed");
      if (args.teamId) q = q.or(`homeTeamId.eq.${args.teamId},awayTeamId.eq.${args.teamId}`);
      if (args.limit) q = q.limit(args.limit);
      const { data } = await q;
      let result = data || [];
      if (args.hasReport === true) result = result.filter((m: any) => m.result != null);
      if (args.hasReport === false) result = result.filter((m: any) => m.result == null);
      if (args.hasReferees === true) result = result.filter((m: any) => m.referees && m.referees.length > 0);
      if (args.hasReferees === false) result = result.filter((m: any) => !m.referees || m.referees.length === 0);
      return result;
    }
    case "getUpcomingMatches": {
      const { data } = await supabase.from("matches").select("*").eq("status", "scheduled").order("date_time", { ascending: true });
      return data || [];
    }
    case "getTeams": {
      const { data } = await supabase.from("teams").select("*").order("name");
      return data || [];
    }
    case "getUsersByRole": {
      const { data } = await supabase.from("profiles").select("*").eq("role", args.role).order("name");
      return data || [];
    }
    case "getNotifications": {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", args._userId).order("created_at", { ascending: false }).limit(args.limit || 5);
      return data || [];
    }
    case "getMatchDetails": {
      const { data } = await supabase.from("matches").select("*").eq("id", args.matchId).maybeSingle();
      return data || null;
    }
    case "updateSettings": {
      const update: Record<string, any> = {};
      if (args.theme) update.theme = args.theme;
      if (args.name) update.name = args.name;
      if (args.nickname !== undefined) update.nickname = args.nickname;
      const { error } = await supabase.from("profiles").update(update).eq("id", args._userId);
      if (error) return { error: error.message };
      return { success: true, updated: Object.keys(update) };
    }
    case "getPendingAssignments": {
      const { data: matches } = await supabase.from("matches").select("*");
      const pending = (matches || []).filter((m: any) =>
        m.referees?.some((r: any) => r.refereeId === args._userId && r.status === "pending")
      );
      return pending;
    }
    case "respondToMatch": {
      const { data: match } = await supabase.from("matches").select("*").eq("id", args.matchId).maybeSingle();
      if (!match) return { error: "Match not found" };
      const updated = (match.referees || []).map((r: any) =>
        r.refereeId === args._userId ? { ...r, status: args.status } : r
      );
      const { error } = await supabase.from("matches").update({ referees: updated }).eq("id", args.matchId);
      if (error) return { error: error.message };
      return { success: true, match: match.home_team_name + " vs " + match.away_team_name, status: args.status };
    }
    case "assignReferee": {
      const { data: match } = await supabase.from("matches").select("*").eq("id", args.matchId).maybeSingle();
      if (!match) return { error: "Match not found" };
      const { data: referee } = await supabase.from("profiles").select("name").eq("id", args.refereeId).maybeSingle();
      if (!referee) return { error: "Referee not found" };
      const newAssignment = { refereeId: args.refereeId, refereeName: referee.name, role: args.role, status: "pending" };
      const updatedReferees = [...(match.referees || []), newAssignment];
      const { error } = await supabase.from("matches").update({ referees: updatedReferees }).eq("id", args.matchId);
      if (error) return { error: error.message };
      return { success: true, match: match.home_team_name + " vs " + match.away_team_name, referee: referee.name, role: args.role };
    }
    case "addTeam": {
      const insert: Record<string, any> = { name: args.name };
      if (args.category) insert.category = args.category;
      if (args.divisions) insert.divisions = args.divisions;
      if (args.coachId) insert.coach_id = args.coachId;
      const { data, error } = await supabase.from("teams").insert(insert).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, team: data.name };
    }
    case "addPlayer": {
      const insert: Record<string, any> = {
        name: args.name,
        birth_date: args.birthDate,
        jersey_number: args.jerseyNumber,
        team_id: args.teamId,
      };
      if (args.position) insert.position = args.position;
      const { data, error } = await supabase.from("players").insert(insert).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, player: data.name, team: data.team_id };
    }
    case "completeMatch": {
      const { data: match } = await supabase.from("matches").select("*").eq("id", args.matchId).maybeSingle();
      if (!match) return { error: "Match not found" };
      const update: Record<string, any> = { status: "completed" };
      if (args.result) update.result = args.result;
      if (args.comments) update.comments = args.comments;
      const { error } = await supabase.from("matches").update(update).eq("id", args.matchId);
      if (error) return { error: error.message };
      return { success: true, match: match.home_team_name + " vs " + match.away_team_name };
    }
    case "sendReport": {
      const { data: match } = await supabase.from("matches").select("*").eq("id", args.matchId).maybeSingle();
      if (!match) return { error: "Match not found" };
      if (match.status !== "completed") return { error: "Match must be completed before sending a report. Use completeMatch first." };
      const update: Record<string, any> = { result: args.result };
      if (args.comments) update.comments = args.comments;
      const { error } = await supabase.from("matches").update(update).eq("id", args.matchId);
      if (error) return { error: error.message };
      return { success: true, match: match.home_team_name + " vs " + match.away_team_name, result: args.result };
    }
    case "markAllAsRead": {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", args._userId).eq("read", false);
      if (error) return { error: error.message };
      return { success: true };
    }
    case "getTopScorers": {
      const { data: matches } = await supabase.from("matches").select("result, home_team_name, away_team_name").eq("status", "completed").not("result", "is", null);
      const scorers: Record<string, { goals: number; team: string }> = {};
      for (const m of matches || []) {
        for (const g of m.result?.goals || []) {
          const team = g.team === "home" ? m.home_team_name : m.away_team_name;
          if (!scorers[g.scorer]) scorers[g.scorer] = { goals: 0, team };
          scorers[g.scorer].goals++;
        }
      }
      const sorted = Object.entries(scorers)
        .map(([scorer, data]) => ({ scorer, ...data }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, args.limit || 10);
      return sorted;
    }
    case "getStandings": {
      const q = supabase.from("matches").select("home_team_id, away_team_id, home_team_name, away_team_name, home_division, away_division, result").eq("status", "completed").not("result", "is", null);
      const { data: matches } = await q;
      const standings: Record<string, { teamName: string; teamDivision: string; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; points: number }> = {};
      for (const m of matches || []) {
        const teams = [
          { id: m.home_team_id, name: m.home_team_name, division: m.home_division, isHome: true },
          { id: m.away_team_id, name: m.away_team_name, division: m.away_division, isHome: false }
        ];
        for (const t of teams) {
          if (!t.id) continue;
          if (args.division && t.division !== args.division) continue;
          if (!standings[t.id]) standings[t.id] = { teamName: t.name, teamDivision: t.division, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
          const s = standings[t.id];
          const gf = t.isHome ? (m.result?.homeScore ?? 0) : (m.result?.awayScore ?? 0);
          const ga = t.isHome ? (m.result?.awayScore ?? 0) : (m.result?.homeScore ?? 0);
          s.played++;
          s.goalsFor += gf;
          s.goalsAgainst += ga;
          if (gf > ga) { s.wins++; s.points += 3; }
          else if (gf === ga) { s.draws++; s.points += 1; }
          else s.losses++;
        }
      }
      return Object.values(standings).filter(t => t.played > 0).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (a.played !== b.played) return a.played - b.played;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      }).slice(0, args.limit || 50);
    }
    case "addMatch": {
      const insert: Record<string, any> = {
        home_team_id: args.homeTeamId,
        away_team_id: args.awayTeamId,
        home_team_name: args.homeTeamName,
        away_team_name: args.awayTeamName,
        home_division: args.homeDivision,
        away_division: args.awayDivision,
        date_time: args.dateTime,
        status: "scheduled",
        referees: [],
      };
      if (args.location) insert.location = args.location;
      if (args.category) insert.category = args.category;
      const { data, error } = await supabase.from("matches").insert(insert).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, match: data.home_team_name + " vs " + data.away_team_name };
    }
    case "viewLineup": {
      const { data: match } = await supabase.from("matches").select("id, home_team_id, away_team_id, home_team_name, away_team_name, lineup").eq("id", args.matchId).maybeSingle();
      if (!match) return { error: "Match not found" };
      return { match: match.home_team_name + " vs " + match.away_team_name, lineup: match.lineup || [] };
    }
    case "submitLineup": {
      const { data: match } = await supabase.from("matches").select("id, home_team_id, away_team_id, home_team_name, away_team_name, lineup").eq("id", args.matchId).maybeSingle();
      if (!match) return { error: "Match not found" };
      const current = match.lineup || [];
      const existing = current.filter((l: any) => l.submittedBy !== args._userId);
      const updated = [...existing, { submittedBy: args._userId, starting: args.starting || [], substitutes: args.substitutes || [] }];
      const { error } = await supabase.from("matches").update({ lineup: updated }).eq("id", args.matchId);
      if (error) return { error: error.message };
      return { success: true, match: match.home_team_name + " vs " + match.away_team_name, starting: (args.starting || []).length, substitutes: (args.substitutes || []).length };
    }
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

function formatToolResult(tool: string, result: any): string {
  if (result === null || result === undefined) return "No data found.";
  if (result.error) return `Error: ${result.error}`;

  switch (tool) {
    case "getMatches":
    case "getUpcomingMatches":
    case "getPendingAssignments": {
      if (!Array.isArray(result) || result.length === 0) return "No matches found.";
      return result.map((m: any) => {
        const lines = [`${m.home_team_name} vs ${m.away_team_name}`];
        if (m.date_time) {
          const d = new Date(m.date_time);
          lines.push(`Date: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`);
        }
        if (m.location) lines.push(`Location: ${m.location}`);
        if (m.home_division) lines.push(`Division: ${m.home_division}`);
        lines.push(`Status: ${m.status}`);
        if (m.result) lines.push(`Score: ${m.result.homeScore} - ${m.result.awayScore}`);
        return lines.join("\n");
      }).join("\n\n");
    }
    case "getTeams": {
      if (!Array.isArray(result) || result.length === 0) return "No teams found.";
      return result.map((t: any) => {
        const lines = [t.name];
        if (t.category) lines.push(`Category: ${t.category}`);
        if (t.divisions) {
          const divs = typeof t.divisions === "string" ? JSON.parse(t.divisions) : t.divisions;
          if (Array.isArray(divs) && divs.length > 0) lines.push(`Divisions: ${divs.join(", ")}`);
        }
        return lines.join("\n");
      }).join("\n\n");
    }
    case "getUsersByRole": {
      if (!Array.isArray(result) || result.length === 0) return `No ${result.role || "users"} found.`;
      return result.map((u: any) => `${u.name || u.email}`).join("\n");
    }
    case "getNotifications": {
      if (!Array.isArray(result) || result.length === 0) return "No notifications.";
      return result.map((n: any) => `${n.title}: ${n.message}`).join("\n");
    }
    case "getMatchDetails": {
      if (!result) return "Match not found.";
      const m = result;
      const lines = [`${m.home_team_name} vs ${m.away_team_name}`];
      if (m.date_time) {
        const d = new Date(m.date_time);
        lines.push(`Date: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`);
      }
      if (m.location) lines.push(`Location: ${m.location}`);
      if (m.home_division) lines.push(`Division: ${m.home_division}`);
      lines.push(`Status: ${m.status}`);
      if (m.result) lines.push(`Score: ${m.result.homeScore} - ${m.result.awayScore}`);
      if (m.referees?.length > 0) {
        lines.push("Referees: " + m.referees.map((r: any) => `${r.refereeName} (${r.role}, ${r.status})`).join(", "));
      }
      return lines.join("\n");
    }
    case "getStandings": {
      if (!Array.isArray(result) || result.length === 0) return "No standings data.";
      return result.map((s: any, i: number) => {
        const gd = s.goalsFor - s.goalsAgainst;
        const gdStr = gd >= 0 ? `+${gd}` : `${gd}`;
        return `${i + 1}. ${s.teamName}\n   Played: ${s.played} | W: ${s.wins} | D: ${s.draws} | L: ${s.losses} | GF: ${s.goalsFor} | GA: ${s.goalsAgainst} | GD: ${gdStr} | Pts: ${s.points}`;
      }).join("\n\n");
    }
    case "getTopScorers": {
      if (!Array.isArray(result) || result.length === 0) return "No goal scorers found.";
      return result.map((s: any, i: number) => `${i + 1}. ${s.scorer} (${s.team}) - ${s.goals} goals`).join("\n");
    }
    case "viewLineup": {
      if (!result.lineup || !Array.isArray(result.lineup) || result.lineup.length === 0) return "No lineup submitted for this match.";
      return result.lineup.map((l: any) => {
        const teamLabel = l.submittedBy === "home" ? result.match?.split(" vs ")[0] : result.match?.split(" vs ")[1] || "Team";
        const lines = [`${teamLabel} Lineup:`];
        if (l.starting?.length > 0) lines.push(`Starting XI: ${l.starting.join(", ")}`);
        if (l.substitutes?.length > 0) lines.push(`Substitutes: ${l.substitutes.join(", ")}`);
        return lines.join("\n");
      }).join("\n\n");
    }
    default: {
      if (result.success) {
        let parts: string[] = [];
        if (result.match) parts.push(`Match: ${result.match}`);
        if (result.team) parts.push(`Team: ${result.team}`);
        if (result.player) parts.push(`Player: ${result.player}`);
        if (result.referee) parts.push(`Referee: ${result.referee}`);
        if (result.role) parts.push(`Role: ${result.role}`);
        if (result.status) parts.push(`Status: ${result.status}`);
        if (result.starting !== undefined) parts.push(`Starting players: ${result.starting}`);
        if (result.substitutes !== undefined) parts.push(`Substitutes: ${result.substitutes}`);
        if (result.updated?.length > 0) parts.push(`Updated: ${result.updated.join(", ")}`);
        if (result.result) parts.push(`Score: ${result.result.homeScore} - ${result.result.awayScore}`);
        return parts.length > 0 ? `Done. ${parts.join(" | ")}` : "Done.";
      }
      if (typeof result === "string") return result;
      return JSON.stringify(result);
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Missing Authorization header" }, { status: 401, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const { message, history } = await req.json();
  if (!message) return Response.json({ error: "Message is required" }, { status: 400, headers: corsHeaders });

  const contextInfo = `Current user: ${profile?.name || "Unknown"}, role: ${profile?.role || "unknown"}`;

  const messages: any[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextInfo}` },
  ];
  for (const m of (history || []).slice(-10)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: "user", content: message });

  let finalText = "";

  for (let turn = 0; turn < 5; turn++) {
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3-32b",
          messages,
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const content = result.choices?.[0]?.message?.content;
        if (!content) { finalText = "Sorry, I couldn't process that."; break; }

        const trimmed = content.trim();
        const braceStart = trimmed.indexOf('{');
        const braceEnd = trimmed.lastIndexOf('}');

        const isToolCall = braceStart !== -1 && braceEnd > braceStart && (() => {
          const jsonStr = trimmed.slice(braceStart, braceEnd + 1);
          return jsonStr.includes('"tool"');
        })();

        if (isToolCall) {
          const jsonStr = trimmed.slice(braceStart, braceEnd + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            const toolResult = await callTool(parsed.tool, { ...parsed.args, _userId: user.id }, supabase);
            finalText = formatToolResult(parsed.tool, toolResult);
            break;
          } catch {
            // tool call failed, fall through to treat as normal response
          }
        }

        const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (!isToolCall && cleaned) {
          finalText = cleaned.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '').trim();
        }
        break;
      }

      const errText = await res.text();
      lastError = errText;
      if (errText.includes("rate_limit_exceeded")) {
        const match = errText.match(/try again in (\d+\.?\d*)s/);
        const wait = match ? parseFloat(match[1]) + 1 : 5;
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }
      break;
    }
    if (finalText) break;
    if (lastError) {
      if (lastError.includes("rate_limit_exceeded")) {
        finalText = "The assistant is temporarily busy. Please wait a moment and try again.";
      } else {
        finalText = "Sorry, something went wrong. Please try again.";
      }
      break;
    }
  }

  return Response.json({ response: finalText || "Please try again." }, { headers: corsHeaders });
});
