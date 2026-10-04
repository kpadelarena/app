"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy,
  Users,
  CalendarRange,
  ListOrdered,
  Plus,
  X,
  Shuffle,
  RefreshCw,
  Settings2,
  ChevronDown,
  Grid3x3,
  UserPlus,
  Trash2,
  UserCircle,
  LogOut,
  Share2,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { signUpWithUsername, signInWithUsername, signOut, getCurrentProfile } from "./lib/auth";
import {
  getMyClub,
  createClub,
  updateClub,
  getClubPlayers,
  addGuestPlayer,
  removeClubMember,
  joinClubAsPlayer,
  getRounds,
  replaceAllRounds,
  appendRound,
  removeLastRound,
  updateMatchScore,
  clearAllMatches,
  getBookings,
  createBookingGroup,
  joinBookingGroup,
  removeBookingParticipant,
  uploadClubPhoto,
  setClubPhotoUrl,
  uploadResultPhoto as uploadResultPhotoToStorage,
  setResultPhotoUrl,
  uploadAvatar,
  setAvatarUrl,
  updateProfileLevel as updateProfileLevelInDb,
  subscribeToClub,
} from "./lib/db";
import { uid } from "./lib/uid";
import { TIME_SLOTS, nextDays } from "./features/booking/slots";
import { generateAmericanoRounds, generateMexicanoRound, generateRoundRobinRounds } from "./features/league/schedule";
import { individualStandings, teamStandings } from "./features/league/standings";
import { C, FONT } from "./styles/tokens";
import { Eyebrow } from "./components/ui/Eyebrow";
import { PrimaryButton } from "./components/ui/PrimaryButton";
import { SectionCard } from "./components/ui/SectionCard";
import { EmptyHint } from "./components/ui/EmptyHint";
import { Th, Td } from "./components/ui/Table";
import { PhotoInput } from "./components/ui/PhotoInput";


const LEVEL_MIN = 0;
const LEVEL_MAX = 7;
const LEVEL_STEP = 0.1;

const VENUES = ["Yongsan Mmove", "Gimpo Padel Society", "Dongtan Garros Padel"];

const CATEGORIES = [
  { key: "rental", label: "대관", color: "#8B5CF6" },
  { key: "match", label: "매치", color: "#16A34A" },
  { key: "league", label: "리그매치", color: "#D97706" },
  { key: "lesson", label: "레슨", color: "#E4574B" },
];
const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];

const REGIONS = [
  "서울", "인천", "경기도", "부산", "대구", "광주", "대전", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const AMENITIES = [
  { key: "parking", label: "주차" },
  { key: "lockerRoom", label: "탈의실" },
  { key: "shower", label: "샤워시설" },
  { key: "restroom", label: "화장실" },
  { key: "racketRental", label: "라켓대여" },
  { key: "wifi", label: "와이파이" },
];

const BOOKING_SLOTS_PER_MATCH = 4;

/* ---------------------------------------------------------
   코트 다이어그램 매치 카드 — 시그니처 요소
--------------------------------------------------------- */
function CourtMatch({ match, nameOf, onScore, disabled }) {
  const a = Number(match.scoreA);
  const b = Number(match.scoreB);
  const hasScore = match.scoreA !== "" && match.scoreB !== "" && !isNaN(a) && !isNaN(b);
  const aWins = hasScore && a > b;
  const bWins = hasScore && b > a;

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        background: C.turf,
        border: `1px solid ${C.turfLight}`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <span
          style={{
            fontFamily: FONT.display,
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.65)",
            textTransform: "uppercase",
          }}
        >
          Court {match.court}
        </span>
      </div>

      <div style={{ display: "flex", position: "relative" }}>
        {/* net line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 0,
            borderLeft: `2px dashed ${C.line}`,
          }}
        />
        {[match.sideA, match.sideB].map((side, si) => {
          const isWinner = si === 0 ? aWins : bWins;
          return (
            <div
              key={si}
              style={{
                flex: 1,
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: isWinner ? "rgba(215,241,59,0.08)" : "transparent",
              }}
            >
              {side.map((id) => (
                <div
                  key={id}
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: isWinner ? 700 : 500,
                    fontSize: 14,
                    color: isWinner ? C.ball : "#EDEFE8",
                    lineHeight: 1.35,
                  }}
                >
                  {nameOf(id)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "10px 12px 14px",
        }}
      >
        <ScoreInput
          value={match.scoreA}
          onChange={(v) => onScore("scoreA", v)}
          highlight={aWins}
          disabled={disabled}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: FONT.mono }}>
          :
        </span>
        <ScoreInput
          value={match.scoreB}
          onChange={(v) => onScore("scoreB", v)}
          highlight={bWins}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ScoreInput({ value, onChange, highlight, disabled }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      style={{
        width: 48,
        height: 40,
        textAlign: "center",
        borderRadius: 8,
        border: `1px solid ${highlight ? C.ball : "rgba(255,255,255,0.25)"}`,
        background: highlight ? "rgba(215,241,59,0.14)" : "rgba(255,255,255,0.06)",
        color: highlight ? C.ball : "#fff",
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: 17,
        outline: "none",
      }}
    />
  );
}

/* ---------------------------------------------------------
   메인 앱
--------------------------------------------------------- */
export default function PadelLeagueApp() {
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [tab, setTab] = useState("booking");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [numRounds, setNumRounds] = useState(5);
  const [editingName, setEditingName] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [resultPhotoUploading, setResultPhotoUploading] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  const mapProfile = (row) =>
    row && {
      id: row.id,
      name: row.display_name,
      username: row.username,
      level: row.level ?? 3,
      photo: row.photo_url,
      region: row.region,
      email: row.email,
      phone: row.phone,
      gender: row.gender,
    };

  const assembleLeague = (club, players, rounds, bookings) => ({
    id: club.id,
    name: club.name,
    venue: club.venue,
    format: club.format,
    courtCount: club.court_count,
    amenities: club.amenities || {},
    photo: club.photo_url,
    resultPhoto: club.result_photo_url,
    ownerId: club.owner_id,
    players,
    teams: [], // round-robin pairing preview — session-local only, see README
    rounds,
    bookings,
    createdAt: club.created_at,
  });

  const reloadClubData = useCallback(async (clubId) => {
    const [players, rounds, bookings] = await Promise.all([getClubPlayers(clubId), getRounds(clubId), getBookings(clubId)]);
    const { data: club } = await supabase.from("clubs").select("*").eq("id", clubId).single();
    if (club) setLeague((prev) => assembleLeague(club, players, rounds, bookings));
  }, []);

  const loadEverything = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      setCurrentMember(mapProfile(profile));

      let club = null;
      if (profile) {
        club = await getMyClub(profile.id);
        if (!club) club = await createClub(profile.id, { venue: VENUES[0] });
      } else {
        const { data } = await supabase.from("clubs").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
        club = data || null;
      }

      if (club) {
        const [players, rounds, bookings] = await Promise.all([
          getClubPlayers(club.id),
          getRounds(club.id),
          getBookings(club.id),
        ]);
        setLeague(assembleLeague(club, players, rounds, bookings));
      } else {
        setLeague(null);
      }
    } catch (e) {
      setLeague(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEverything();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadEverything();
    });
    return () => sub?.subscription?.unsubscribe();
  }, [loadEverything]);

  // Live sync: reflect other viewers' changes to this same club.
  useEffect(() => {
    if (!league?.id) return undefined;
    const unsubscribe = subscribeToClub(league.id, () => reloadClubData(league.id));
    return unsubscribe;
  }, [league?.id, reloadClubData]);

  /* ---------------------------------------------------------------
     Photos — club banner, result photo, profile avatar
  --------------------------------------------------------------- */
  const uploadVenuePhoto = useCallback(
    async (_venue, file) => {
      if (!league) return;
      setPhotoUploading(true);
      setPhotoError("");
      const previewUrl = URL.createObjectURL(file);
      setLeague((prev) => ({ ...prev, photo: previewUrl }));
      try {
        const url = await uploadClubPhoto(league.id, file);
        setLeague((prev) => ({ ...prev, photo: url }));
      } catch (e) {
        setPhotoError("사진 저장에 실패했어요. 권한이 있는 계정인지 확인해 주세요.");
      } finally {
        setPhotoUploading(false);
      }
    },
    [league]
  );

  const setVenuePhotoUrl = useCallback(
    async (_venue, url) => {
      if (!league) return;
      setLeague((prev) => ({ ...prev, photo: url }));
      try {
        await setClubPhotoUrl(league.id, url);
      } catch (e) {
        setPhotoError("사진 저장에 실패했어요. 권한이 있는 계정인지 확인해 주세요.");
      }
    },
    [league]
  );

  const toggleVenueAmenity = useCallback(
    async (_venue, key) => {
      if (!league) return;
      const next = { ...(league.amenities || {}), [key]: !league.amenities?.[key] };
      setLeague((prev) => ({ ...prev, amenities: next }));
      try {
        await updateClub(league.id, { amenities: next });
      } catch (e) {
        setSaveError(true);
      }
    },
    [league]
  );

  const uploadResultPhoto = useCallback(
    async (file) => {
      if (!league) return;
      setResultPhotoUploading(true);
      const previewUrl = URL.createObjectURL(file);
      setLeague((prev) => ({ ...prev, resultPhoto: previewUrl }));
      try {
        const url = await uploadResultPhotoToStorage(league.id, file);
        setLeague((prev) => ({ ...prev, resultPhoto: url }));
      } catch (e) {
        setSaveError(true);
      } finally {
        setResultPhotoUploading(false);
      }
    },
    [league]
  );

  const setResultPhotoUrlHandler = useCallback(
    async (url) => {
      if (!league) return;
      setLeague((prev) => ({ ...prev, resultPhoto: url }));
      try {
        await setResultPhotoUrl(league.id, url);
      } catch (e) {
        setSaveError(true);
      }
    },
    [league]
  );

  const updateProfilePhoto = useCallback(
    async (file) => {
      if (!currentMember) return;
      setProfileUploading(true);
      try {
        const url = await uploadAvatar(currentMember.id, file);
        setCurrentMember((prev) => ({ ...prev, photo: url }));
      } catch (e) {
        // couldn't read/upload the file
      } finally {
        setProfileUploading(false);
      }
    },
    [currentMember]
  );

  const updateProfilePhotoUrl = useCallback(
    async (url) => {
      if (!currentMember) return;
      setCurrentMember((prev) => ({ ...prev, photo: url }));
      try {
        await setAvatarUrl(currentMember.id, url);
      } catch (e) {
        // best effort
      }
    },
    [currentMember]
  );

  const updateProfileLevel = useCallback(
    async (level) => {
      if (!currentMember) return;
      setCurrentMember((prev) => ({ ...prev, level }));
      try {
        await updateProfileLevelInDb(currentMember.id, level);
      } catch (e) {
        // best effort
      }
    },
    [currentMember]
  );

  /* ---------------------------------------------------------------
     Auth
  --------------------------------------------------------------- */
  const signUp = useCallback(
    async ({ name, username, password, phone, email, gender, region, level, photo }) => {
      const result = await signUpWithUsername({ username, password, name, phone, email, gender, region, level, photoUrl: photo });
      if (result.error) {
        return { error: result.error.message === "duplicate_username" ? "duplicate_username" : result.error.message };
      }
      const profile = await getCurrentProfile();
      setCurrentMember(mapProfile(profile));

      if (league) {
        try {
          await joinClubAsPlayer(league.id, result.user.id);
        } catch (e) {
          // best effort; RLS or race — not fatal to signup itself
        }
        await reloadClubData(league.id);
      } else {
        const club = await createClub(result.user.id, { venue: VENUES[0] });
        await reloadClubData(club.id);
      }
      return { user: result.user };
    },
    [league, reloadClubData]
  );

  const loginWithPassword = useCallback(async (username, password) => {
    const result = await signInWithUsername(username, password);
    if (result.error) return { error: result.error.message };
    const profile = await getCurrentProfile();
    setCurrentMember(mapProfile(profile));
    const club = await getMyClub(result.user.id);
    if (club) {
      const [players, rounds, bookings] = await Promise.all([getClubPlayers(club.id), getRounds(club.id), getBookings(club.id)]);
      setLeague(assembleLeague(club, players, rounds, bookings));
    }
    return { user: result.user };
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setCurrentMember(null);
  }, []);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: "K-Padel Arena Manager",
      text: "코트 예약 · 리그 · 순위를 한눈에 — K-Padel Arena Manager",
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (e) {
      // user cancelled or share failed; fall through to copy-link
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      // clipboard unavailable; nothing more we can do silently
    }
  }, []);

  /* Small scalar club-field saves (name/venue) used directly from the
     header's inline inputs. Format/court-count have their own handlers
     below since they also need to touch matches. */
  const persist = useCallback(
    async (next) => {
      if (!league) return;
      setLeague(next);
      setSaveStatus("saving");
      const patch = {};
      if (next.name !== league.name) patch.name = next.name;
      if (next.venue !== league.venue) patch.venue = next.venue;
      try {
        if (Object.keys(patch).length) await updateClub(league.id, patch);
        setSaveError(false);
        setSaveStatus("saved");
      } catch (e) {
        setSaveError(true);
        setSaveStatus("error");
      }
    },
    [league]
  );

  const nameOf = useCallback(
    (id) => {
      if (!league) return id;
      const p = league.players.find((x) => x.id === id);
      if (p) return p.name;
      const t = league.teams.find((x) => x.id === id);
      if (t) return t.name;
      return "?";
    },
    [league]
  );

  const standings = useMemo(() => {
    if (!league) return [];
    return league.format === "round_robin"
      ? teamStandings(league.teams, league.rounds)
      : individualStandings(league.players, league.rounds);
  }, [league]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.paper,
          fontFamily: FONT.body,
          color: C.charcoal,
        }}
      >
        불러오는 중...
      </div>
    );
  }

  if (!league) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
          background: C.paper,
          fontFamily: FONT.body,
          color: C.charcoal,
          padding: 20,
          textAlign: "center",
        }}
      >
        <div>아직 만들어진 클럽이 없어요.</div>
        <PrimaryButton onClick={() => setAuthModalOpen(true)}>회원가입하고 클럽 만들기</PrimaryButton>
        {authModalOpen && (
          <AuthModal
            members={[{}]}
            currentMember={currentMember}
            onLoginWithPassword={loginWithPassword}
            onLogout={logout}
            onSignUp={signUp}
            onUploadProfilePhoto={updateProfilePhoto}
            onSetProfilePhotoUrl={updateProfilePhotoUrl}
            onUpdateLevel={updateProfileLevel}
            profileUploading={profileUploading}
            onClose={() => setAuthModalOpen(false)}
          />
        )}
      </div>
    );
  }

  const addPlayer = async () => {
    const name = newPlayerName.trim();
    if (!name) return;
    setNewPlayerName("");
    try {
      const player = await addGuestPlayer(league.id, name);
      setLeague((prev) => ({ ...prev, players: [...prev.players, player] }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const removePlayer = async (id) => {
    setLeague((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
      teams: prev.teams.filter((t) => !t.playerIds.includes(id)),
    }));
    try {
      await removeClubMember(league.id, id);
    } catch (e) {
      setSaveError(true);
    }
  };

  // Round-robin team pairing is a session-local preview only, kept in
  // React state and not yet written to Supabase — see README.md
  // ("알려진 제한사항") for why and what finishing it would take.
  const autoAssignTeams = () => {
    const shuffled = [...league.players].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const pair = [shuffled[i], shuffled[i + 1]];
      teams.push({
        id: `team-${uid()}`,
        name: pair.map((p) => p.name).join(" & "),
        playerIds: pair.map((p) => p.id),
      });
    }
    setLeague((prev) => ({ ...prev, teams }));
  };

  const generateSchedule = async () => {
    try {
      if (league.format === "americano") {
        if (league.players.length < 4) return;
        const rounds = generateAmericanoRounds(league.players, league.courtCount, numRounds);
        await replaceAllRounds(league.id, rounds);
        setLeague((prev) => ({ ...prev, rounds }));
      } else if (league.format === "mexicano") {
        if (league.players.length < 4) return;
        const roundData = generateMexicanoRound(league.players, [], league.courtCount);
        if (roundData) {
          const rounds = [{ roundNumber: 1, matches: roundData.matches, sitOut: roundData.sitOut }];
          await replaceAllRounds(league.id, rounds);
          setLeague((prev) => ({ ...prev, rounds }));
        }
      } else {
        if (league.teams.length < 2) return;
        const rounds = generateRoundRobinRounds(league.teams, league.courtCount);
        // Not yet persisted to Supabase for round-robin (team ids
        // aren't real player ids) — local-only for this session.
        setLeague((prev) => ({ ...prev, rounds }));
      }
      setTab("schedule");
    } catch (e) {
      setSaveError(true);
    }
  };

  const generateNextMexicanoRound = async () => {
    if (league.players.length < 4) return;
    const roundData = generateMexicanoRound(league.players, league.rounds, league.courtCount);
    if (!roundData) return;
    const newRound = {
      roundNumber: league.rounds.length + 1,
      matches: roundData.matches,
      sitOut: roundData.sitOut,
    };
    try {
      await appendRound(league.id, newRound);
      setLeague((prev) => ({ ...prev, rounds: [...prev.rounds, newRound] }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const removeLastMexicanoRound = async () => {
    const last = league.rounds[league.rounds.length - 1];
    if (!last) return;
    try {
      await removeLastRound(league.id, last.roundNumber);
      setLeague((prev) => ({ ...prev, rounds: prev.rounds.slice(0, -1) }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const updateScore = async (roundIdx, matchId, field, value) => {
    setLeague((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round, ri) =>
        ri !== roundIdx
          ? round
          : { ...round, matches: round.matches.map((m) => (m.id === matchId ? { ...m, [field]: value } : m)) }
      ),
    }));
    if (league.format === "round_robin") return; // local-only, see note above
    try {
      await updateMatchScore(matchId, field, value);
    } catch (e) {
      setSaveError(true);
    }
  };

  const setFormat = async (format) => {
    if (format === league.format) return;
    setLeague((prev) => ({ ...prev, format, rounds: [] }));
    try {
      await updateClub(league.id, { format });
      if (format !== "round_robin") await replaceAllRounds(league.id, []);
    } catch (e) {
      setSaveError(true);
    }
  };

  const handleCourtCountChange = async (v) => {
    setLeague((prev) => ({ ...prev, courtCount: v }));
    try {
      await updateClub(league.id, { courtCount: v });
    } catch (e) {
      setSaveError(true);
    }
  };

  const resetLeague = async () => {
    try {
      await clearAllMatches(league.id);
      setLeague((prev) => ({ ...prev, rounds: [] }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const handleJoinSlot = async ({ date, time, court, category, duration, existing }, participant) => {
    try {
      if (existing) {
        if (existing.players.length >= BOOKING_SLOTS_PER_MATCH) return;
        await joinBookingGroup(league.id, existing.groupId, participant);
      } else {
        const startIdx = TIME_SLOTS.indexOf(time);
        const times = Array.from({ length: duration }, (_, k) => TIME_SLOTS[startIdx + k]);
        await createBookingGroup(league.id, { court, date, times, category, participant });
      }
      const bookings = await getBookings(league.id);
      setLeague((prev) => ({ ...prev, bookings }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const handleRemoveParticipant = async (existing, participantId) => {
    const player = existing.players.find((p) => p.id === participantId);
    if (!player) return;
    const isMember = league.players.some((p) => p.id === participantId);
    try {
      await removeBookingParticipant(league.id, existing.groupId, isMember ? { profileId: participantId } : { name: player.name });
      const bookings = await getBookings(league.id);
      setLeague((prev) => ({ ...prev, bookings }));
    } catch (e) {
      setSaveError(true);
    }
  };

  const venuePhotos = { [league.venue]: league.photo };
  const venueAmenities = { [league.venue]: league.amenities };

  const tabs = [
    { key: "booking", label: "코트 예약", icon: Grid3x3 },
    { key: "myschedule", label: "내 일정", icon: UserCircle },
    { key: "players", label: "선수 · 팀", icon: Users },
    { key: "schedule", label: "대진표", icon: CalendarRange },
    { key: "standings", label: "순위", icon: ListOrdered },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        fontFamily: FONT.body,
        color: C.charcoal,
      }}
    >

      {/* Header */}
      <div style={{ background: C.ink, color: "#fff", padding: "20px 20px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} color={C.ball} />
              <Eyebrow>K-PADEL ARENA MANAGER</Eyebrow>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <img
                src="/brand-logo.jpg"
                alt="K-Padel Arena"
                style={{
                  width: 108,
                  height: 27,
                  objectFit: "contain",
                }}
              />
              <SaveStatus status={saveStatus} />
              <button
                onClick={handleShare}
                title="카카오톡·SNS로 공유하기"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "transparent",
                  color: shareCopied ? C.ball : "rgba(255,255,255,0.75)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Share2 size={12} />
                {shareCopied ? "링크 복사됨" : "공유"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            {editingName ? (
              <input
                autoFocus
                value={league.name}
                onChange={(e) => setLeague({ ...league, name: e.target.value })}
                onBlur={() => {
                  setEditingName(false);
                  persist(league);
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                style={{
                  fontFamily: FONT.display,
                  fontSize: 28,
                  fontWeight: 700,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${C.ball}`,
                  color: "#fff",
                  outline: "none",
                  padding: "2px 0",
                }}
              />
            ) : (
              <h1
                onClick={() => setEditingName(true)}
                style={{
                  fontFamily: FONT.display,
                  fontSize: 28,
                  fontWeight: 700,
                  margin: 0,
                  cursor: "text",
                }}
              >
                {league.name}
              </h1>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <VenueSelect value={league.venue} onChange={(v) => persist({ ...league, venue: v })} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <FormatPill
              active={league.format === "americano"}
              onClick={() => setFormat("americano")}
              label="아메리카노 · 개인전"
              tooltip="매 라운드 파트너가 바뀌며 모두와 한 번씩 게임해요. 개인 포인트 합산으로 순위를 매겨요."
            />
            <FormatPill
              active={league.format === "mexicano"}
              onClick={() => setFormat("mexicano")}
              label="멕시카노 · 개인전"
              tooltip="라운드마다 현재 순위를 기준으로 짝을 다시 맞춰요 (1위+4위 vs 2위+3위). 실력 차가 나도 접전이 되도록 유도해요."
            />
            <FormatPill
              active={league.format === "round_robin"}
              onClick={() => setFormat("round_robin")}
              label="라운드로빈 · 팀전"
              tooltip="처음에 정한 고정 팀끼리 서로 한 번씩 맞붙는 리그전 방식이에요. (이 형식은 아직 이 기기에만 저장돼요)"
            />
            <CourtStepper value={league.courtCount} onChange={handleCourtCountChange} />
            <div style={{ flex: 1 }} />
            {currentMember ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px 5px 5px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {currentMember.photo ? (
                  <img
                    src={currentMember.photo}
                    alt={currentMember.name}
                    style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <UserCircle size={22} color="rgba(255,255,255,0.7)" />
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentMember.name}</span>
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.ball,
                  }}
                >
                  Lv.{currentMember.level.toFixed(1)}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: `1px solid ${C.ball}`,
                  background: "transparent",
                  color: C.ball,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                회원가입 · 로그인
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginTop: 20, overflowX: "auto" }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${active ? C.ball : "transparent"}`,
                    color: active ? C.ball : "rgba(255,255,255,0.55)",
                    fontFamily: FONT.body,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        {tab === "booking" && (
          <BookingTab
            league={league}
            onJoinSlot={handleJoinSlot}
            onRemoveParticipant={handleRemoveParticipant}
            venuePhotos={venuePhotos}
            onUploadPhoto={uploadVenuePhoto}
            onSetPhotoUrl={setVenuePhotoUrl}
            photoUploading={photoUploading}
            photoError={photoError}
            venueAmenities={venueAmenities}
            onToggleAmenity={toggleVenueAmenity}
          />
        )}

        {tab === "myschedule" && (
          <MyScheduleTab league={league} currentMember={currentMember} onOpenAuth={() => setAuthModalOpen(true)} />
        )}

        {tab === "players" && (
          <PlayersTab
            league={league}
            newPlayerName={newPlayerName}
            setNewPlayerName={setNewPlayerName}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            autoAssignTeams={autoAssignTeams}
          />
        )}

        {tab === "schedule" && (
          <ScheduleTab
            league={league}
            numRounds={numRounds}
            setNumRounds={setNumRounds}
            generateSchedule={generateSchedule}
            updateScore={updateScore}
            nameOf={nameOf}
            onGenerateNextMexicanoRound={generateNextMexicanoRound}
            onRemoveLastMexicanoRound={removeLastMexicanoRound}
          />
        )}

        {tab === "standings" && (
          <StandingsTab
            league={league}
            standings={standings}
            onUploadResultPhoto={uploadResultPhoto}
            onSetResultPhotoUrl={setResultPhotoUrlHandler}
            resultPhotoUploading={resultPhotoUploading}
          />
        )}

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <button
            onClick={() => {
              if (window.confirm("이번 시즌의 대진표를 모두 지우고 새로 시작할까요? (선수·클럽 정보는 유지돼요)")) resetLeague();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(27,36,34,0.45)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            새 시즌으로 초기화
          </button>
          {saveError && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>
              저장에 실패했어요. 클럽 관리자 권한이 있는 계정으로 로그인했는지 확인해 주세요.
            </div>
          )}
        </div>
      </div>

      {authModalOpen && (
        <AuthModal
          members={currentMember ? [] : [{}]}
          currentMember={currentMember}
          onLoginWithPassword={loginWithPassword}
          onLogout={logout}
          onSignUp={signUp}
          onUploadProfilePhoto={updateProfilePhoto}
          onSetProfilePhotoUrl={updateProfilePhotoUrl}
          onUpdateLevel={updateProfileLevel}
          profileUploading={profileUploading}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}

function LevelSlider({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.charcoal }}>레벨 (0.0 ~ 7.0)</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 700, color: C.turf }}>
          {value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={LEVEL_MIN}
        max={LEVEL_MAX}
        step={LEVEL_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 8, accentColor: C.turf }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(27,36,34,0.4)" }}>
        <span>0.0 · 입문</span>
        <span>7.0 · 프로</span>
      </div>
    </div>
  );
}

function AuthModal({
  members,
  currentMember,
  onLoginWithPassword,
  onLogout,
  onSignUp,
  onUploadProfilePhoto,
  onSetProfilePhotoUrl,
  onUpdateLevel,
  profileUploading,
  onClose,
}) {
  const [mode, setMode] = useState(currentMember ? "profile" : members.length ? "login" : "signup");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState(3.0);
  const [signupPhoto, setSignupPhoto] = useState(null); // preview: object URL or pasted URL
  const [signupPhotoFile, setSignupPhotoFile] = useState(null); // raw File, uploaded after account exists
  const [signupError, setSignupError] = useState("");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const submitSignUp = async () => {
    const trimmed = name.trim();
    const trimmedUsername = username.trim();
    setSignupError("");
    if (!trimmed) return;
    if (!trimmedUsername) {
      setSignupError("아이디를 입력해 주세요.");
      return;
    }
    if (password.length < 4) {
      setSignupError("비밀번호는 4자 이상으로 입력해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setSignupError("비밀번호가 일치하지 않아요.");
      return;
    }
    const result = await onSignUp({
      name: trimmed,
      username: trimmedUsername,
      password,
      phone,
      email,
      gender,
      region,
      level,
      // A pasted URL can be saved immediately; a picked file needs a
      // real account to exist first, so it's uploaded just below instead.
      photo: signupPhotoFile ? null : signupPhoto,
    });
    if (result && result.error === "duplicate_username") {
      setSignupError("이미 사용 중인 아이디예요.");
      return;
    }
    if (result && result.error) {
      setSignupError("가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (signupPhotoFile) {
      await onUploadProfilePhoto(signupPhotoFile);
    }
    setMode("profile");
  };

  const submitLogin = async () => {
    setLoginError("");
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setLoginBusy(true);
    const result = await onLoginWithPassword(loginUsername, loginPassword);
    setLoginBusy(false);
    if (result && result.error) {
      setLoginError("아이디 또는 비밀번호가 올바르지 않아요.");
      return;
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,21,26,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: "18px 18px 0 0",
          padding: 20,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Eyebrow>
            {mode === "profile" ? "내 프로필" : mode === "login" ? "로그인" : "회원가입"}
          </Eyebrow>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={C.charcoal} />
          </button>
        </div>

        {mode === "profile" && currentMember && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative" }}>
                {currentMember.photo ? (
                  <img
                    src={currentMember.photo}
                    alt={currentMember.name}
                    style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: C.paperDim,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UserCircle size={34} color="rgba(27,36,34,0.4)" />
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{currentMember.name}</div>
                <div style={{ fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
                  Lv.{currentMember.level.toFixed(1)}
                  {currentMember.phone ? ` · ${currentMember.phone}` : ""}
                  {currentMember.email ? ` · ${currentMember.email}` : ""}
                </div>
              </div>
            </div>

            <PhotoInput
              label={currentMember.photo ? "프로필 사진 교체" : "프로필 사진 추가"}
              uploading={profileUploading}
              onFile={onUploadProfilePhoto}
              onSetUrl={onSetProfilePhotoUrl}
            />

            <LevelSlider value={currentMember.level} onChange={onUpdateLevel} />

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {members.length > 1 && (
                <PrimaryButton
                  onClick={() => setMode("login")}
                  style={{ background: "transparent", color: C.charcoal, border: "1px solid rgba(0,0,0,0.15)" }}
                >
                  다른 계정으로
                </PrimaryButton>
              )}
              <PrimaryButton onClick={onLogout} icon={LogOut} style={{ background: C.danger, color: "#fff" }}>
                로그아웃
              </PrimaryButton>
            </div>
          </div>
        )}

        {mode === "login" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {members.length === 0 ? (
              <EmptyHint text="등록된 회원이 없어요. 먼저 회원가입을 해주세요." />
            ) : (
              <>
                <input
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="아이디"
                  autoCapitalize="off"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호"
                  onKeyDown={(e) => e.key === "Enter" && submitLogin()}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
                />
                {loginError && <div style={{ fontSize: 12, color: C.danger }}>{loginError}</div>}
                <PrimaryButton onClick={submitLogin} disabled={loginBusy}>
                  {loginBusy ? "확인 중..." : "로그인"}
                </PrimaryButton>
              </>
            )}
            <button
              onClick={() => setMode("signup")}
              style={{ marginTop: 8, background: "none", border: "none", color: C.turf, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + 새 회원가입
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {signupPhoto ? (
                <img src={signupPhoto} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: C.paperDim,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserCircle size={30} color="rgba(27,36,34,0.4)" />
                </div>
              )}
              <PhotoInput
                label="프로필 사진"
                uploading={false}
                onFile={(file) => {
                  setSignupPhotoFile(file);
                  setSignupPhoto(URL.createObjectURL(file));
                }}
                onSetUrl={(url) => {
                  setSignupPhotoFile(null);
                  setSignupPhoto(url);
                }}
              />
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
            />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디"
              autoCapitalize="off"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (4자 이상)"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 확인"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
            />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14, color: region ? C.charcoal : "rgba(27,36,34,0.4)" }}
            >
              <option value="">지역 선택 (선택)</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "male", label: "Male" },
                { key: "female", label: "Female" },
              ].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGender(g.key)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: `1px solid ${gender === g.key ? C.turf : "rgba(0,0,0,0.15)"}`,
                    background: gender === g.key ? C.turf : "transparent",
                    color: gender === g.key ? "#fff" : C.charcoal,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 (선택)"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="연락처 (선택)"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14 }}
            />
            <LevelSlider value={level} onChange={setLevel} />

            {signupError && <div style={{ fontSize: 12, color: C.danger }}>{signupError}</div>}

            <PrimaryButton onClick={submitSignUp} icon={UserPlus} disabled={!name.trim() || !username.trim() || password.length < 4}>
              가입하기
            </PrimaryButton>
            {members.length > 0 && (
              <button
                onClick={() => setMode("login")}
                style={{ background: "none", border: "none", color: "rgba(27,36,34,0.5)", fontSize: 13, cursor: "pointer" }}
              >
                이미 계정이 있어요
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyScheduleTab({ league, currentMember, onOpenAuth }) {
  if (!currentMember) {
    return (
      <SectionCard>
        <Eyebrow>내 일정</Eyebrow>
        <EmptyHint text="회원가입 또는 로그인을 하면 내가 예약한 코트와 경기 일정을 모아볼 수 있어요." />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onOpenAuth}>회원가입 · 로그인</PrimaryButton>
        </div>
      </SectionCard>
    );
  }

  const myBookings = (league.bookings || [])
    .filter((b) => b.players.some((p) => p.id === currentMember.id || p.name === currentMember.name))
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const myMatches = [];
  league.rounds.forEach((round) => {
    round.matches.forEach((m) => {
      const inA = m.sideA.includes(currentMember.id);
      const inB = m.sideB.includes(currentMember.id);
      const inTeamA = league.teams.some((t) => t.id === m.sideA[0] && t.playerIds.includes(currentMember.id));
      const inTeamB = league.teams.some((t) => t.id === m.sideB[0] && t.playerIds.includes(currentMember.id));
      if (inA || inB || inTeamA || inTeamB) {
        myMatches.push({ ...m, roundNumber: round.roundNumber, mySide: inA || inTeamA ? "A" : "B" });
      }
    });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>내 코트 예약</Eyebrow>
        {myBookings.length === 0 ? (
          <EmptyHint text="예약한 코트가 없어요. 코트 예약 탭에서 참여해 보세요." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {myBookings.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: C.paperDim,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {b.date} · {b.time}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
                    {b.venue} · 코트 {b.court}
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: categoryOf(b.category).color,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {categoryOf(b.category).label}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <Eyebrow>내 경기 일정</Eyebrow>
        {myMatches.length === 0 ? (
          <EmptyHint text="예정된 리그 경기가 없어요. 대진표를 생성하면 여기에 표시돼요." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {myMatches.map((m) => {
              const a = Number(m.scoreA);
              const b = Number(m.scoreB);
              const played = m.scoreA !== "" && m.scoreB !== "" && !isNaN(a) && !isNaN(b);
              const opponents = (m.mySide === "A" ? m.sideB : m.sideA)
                .map((id) => league.players.find((p) => p.id === id)?.name || league.teams.find((t) => t.id === id)?.name || "?")
                .join(" & ");
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: C.paperDim,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>ROUND {m.roundNumber} · 코트 {m.court}</div>
                    <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>vs {opponents}</div>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontWeight: 700,
                      fontSize: 14,
                      color: played ? C.turf : "rgba(27,36,34,0.35)",
                    }}
                  >
                    {played ? `${m.scoreA} : ${m.scoreB}` : "예정"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SaveStatus({ status }) {
  const map = {
    idle: { dot: "rgba(255,255,255,0.3)", label: "" },
    saving: { dot: C.ball, label: "저장 중" },
    saved: { dot: C.ball, label: "실시간 저장됨" },
    error: { dot: C.danger, label: "저장 실패" },
  };
  const s = map[status] || map.idle;
  if (!s.label) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          display: "inline-block",
        }}
      />
      {s.label}
    </div>
  );
}

function FormatPill({ active, onClick, label, tooltip }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? C.ball : "rgba(255,255,255,0.25)"}`,
        background: active ? "rgba(215,241,59,0.12)" : "transparent",
        color: active ? C.ball : "rgba(255,255,255,0.65)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function VenueSelect({ value, onChange }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "transparent",
          border: `1px solid ${C.glass}`,
          borderRadius: 999,
          color: "#fff",
          padding: "6px 30px 6px 12px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: "pointer",
        }}
      >
        {VENUES.map((v) => (
          <option key={v} value={v} style={{ color: C.charcoal }}>
            {v}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        color="rgba(255,255,255,0.65)"
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
    </div>
  );
}

function CourtStepper({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
      }}
    >
      <Settings2 size={13} color="rgba(255,255,255,0.6)" />
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>코트</span>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        style={{ background: "none", border: "none", color: C.ball, fontSize: 16, cursor: "pointer", width: 18 }}
      >
        −
      </button>
      <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: "#fff", width: 14, textAlign: "center" }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(8, value + 1))}
        style={{ background: "none", border: "none", color: C.ball, fontSize: 16, cursor: "pointer", width: 18 }}
      >
        +
      </button>
    </div>
  );
}

function BookingTab({
  league,
  onJoinSlot,
  onRemoveParticipant,
  venuePhotos,
  onUploadPhoto,
  onSetPhotoUrl,
  photoUploading,
  photoError,
  venueAmenities,
  onToggleAmenity,
}) {
  const days = useMemo(() => nextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(days[0].iso);
  const [activeSlot, setActiveSlot] = useState(null); // { date, time, court }
  const [joinPlayerId, setJoinPlayerId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [duration, setDuration] = useState(1);

  const findBooking = (date, time, court) =>
    (league.bookings || []).find(
      (b) => b.venue === league.venue && b.date === date && b.time === time && b.court === court
    );

  const availableDurations = (date, court, time) => {
    const startIdx = TIME_SLOTS.indexOf(time);
    const out = [];
    for (let d = 1; d <= 3; d++) {
      const endIdx = startIdx + d - 1;
      if (endIdx > TIME_SLOTS.length - 1) break;
      let ok = true;
      for (let k = 0; k < d; k++) {
        if (findBooking(date, TIME_SLOTS[startIdx + k], court)) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(d);
      else break;
    }
    return out.length ? out : [1];
  };

  const openSlot = (date, time, court) => {
    const existing = findBooking(date, time, court);
    setActiveSlot({ date, time, court });
    setJoinPlayerId(league.players[0]?.id || "");
    setGuestName("");
    setCategory(existing ? existing.category : CATEGORIES[0].key);
    setDuration(1);
  };

  const closeModal = () => setActiveSlot(null);

  const joinSlot = () => {
    if (!activeSlot) return;
    const chosenPlayer = league.players.find((p) => p.id === joinPlayerId);
    const name = guestName.trim() || chosenPlayer?.name;
    if (!name) return;
    const { date, time, court } = activeSlot;
    const existing = findBooking(date, time, court);
    const participant = { profileId: guestName.trim() ? null : chosenPlayer?.id, name };

    onJoinSlot({ date, time, court, category, duration, existing }, participant);
    setGuestName("");
    setJoinPlayerId(league.players[0]?.id || "");
  };

  const removeParticipant = (participantId) => {
    if (!activeSlot) return;
    const { date, time, court } = activeSlot;
    const existing = findBooking(date, time, court);
    if (!existing) return;
    onRemoveParticipant(existing, participantId);
  };

  const courts = Array.from({ length: league.courtCount }, (_, i) => i + 1);
  const activeBooking = activeSlot && findBooking(activeSlot.date, activeSlot.time, activeSlot.court);
  const photo = venuePhotos?.[league.venue];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          position: "relative",
          height: 140,
          borderRadius: 16,
          overflow: "hidden",
          background: photo ? `#000` : `linear-gradient(135deg, ${C.turf}, ${C.ink})`,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={league.venue}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
          />
        ) : (
          <CourtWatermark />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 14,
          }}
        >
          <Eyebrow>{league.venue}</Eyebrow>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PhotoInput
              label={photo ? "사진 교체" : "사진 추가"}
              uploading={photoUploading}
              onFile={(file) => onUploadPhoto(league.venue, file)}
              onSetUrl={(url) => onSetPhotoUrl(league.venue, url)}
              dark
            />
          </div>
        </div>
      </div>

      {photoError && (
        <div
          style={{
            fontSize: 12,
            color: C.danger,
            background: "rgba(194,84,80,0.08)",
            border: `1px solid ${C.danger}`,
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          {photoError}
        </div>
      )}

      <SectionCard>
        <Eyebrow color={C.charcoal}>편의시설</Eyebrow>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {AMENITIES.map((a) => {
            const active = !!venueAmenities?.[league.venue]?.[a.key];
            return (
              <button
                key={a.key}
                onClick={() => onToggleAmenity(league.venue, a.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? C.turf : "rgba(0,0,0,0.15)"}`,
                  background: active ? C.turf : "transparent",
                  color: active ? "#fff" : "rgba(27,36,34,0.5)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {active ? "✓ " : ""}
                {a.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard>
        <Eyebrow color={C.charcoal}>날짜선택</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
          {days.map((d) => (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "8px 14px",
                borderRadius: 12,
                border: `1px solid ${selectedDate === d.iso ? C.turf : "rgba(0,0,0,0.12)"}`,
                background: selectedDate === d.iso ? C.turf : "#fff",
                color: selectedDate === d.iso ? "#fff" : C.charcoal,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
                {d.isToday ? "오늘" : d.weekday}
              </span>
              <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 14 }}>
                {d.label}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap", fontSize: 12, color: "rgba(27,36,34,0.6)" }}>
          <LegendDot color="#fff" border="rgba(0,0,0,0.2)" label="예약 가능" />
          <LegendDot color="#D6E6FB" border="#7FA6E0" label="일부 예약 (참여 가능)" />
          <LegendDot color="#3E6FD9" border="#3E6FD9" label="마감" />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12, color: "rgba(27,36,34,0.6)" }}>
          {CATEGORIES.map((c) => (
            <LegendDot key={c.key} color={c.color} border={c.color} label={c.label} />
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `64px repeat(${courts.length}, minmax(96px, 1fr))`,
              gap: 6,
              minWidth: 64 + courts.length * 96,
            }}
          >
            <div />
            {courts.map((c) => (
              <CourtHeaderCell key={c} court={c} />
            ))}

            {TIME_SLOTS.map((time) => (
              <React.Fragment key={time}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontFamily: FONT.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(27,36,34,0.6)",
                  }}
                >
                  {time}
                </div>
                {courts.map((court) => {
                  const booking = findBooking(selectedDate, time, court);
                  return (
                    <BookingCell
                      key={court}
                      booking={booking}
                      onClick={() => openSlot(selectedDate, time, court)}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </SectionCard>

      {activeSlot && (
        <JoinModal
          slot={activeSlot}
          booking={activeBooking}
          players={league.players}
          joinPlayerId={joinPlayerId}
          setJoinPlayerId={setJoinPlayerId}
          guestName={guestName}
          setGuestName={setGuestName}
          category={category}
          setCategory={setCategory}
          duration={duration}
          setDuration={setDuration}
          availableDurations={availableDurations(activeSlot.date, activeSlot.court, activeSlot.time)}
          onJoin={joinSlot}
          onRemove={removeParticipant}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function CourtWatermark() {
  return (
    <svg
      viewBox="0 0 200 120"
      style={{ position: "absolute", right: -14, bottom: -22, width: 200, opacity: 0.14 }}
    >
      <rect x="10" y="10" width="180" height="100" rx="8" fill="none" stroke="white" strokeWidth="4" />
      <line x1="100" y1="10" x2="100" y2="110" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
      <rect x="10" y="40" width="45" height="40" fill="none" stroke="white" strokeWidth="3" />
      <rect x="145" y="40" width="45" height="40" fill="none" stroke="white" strokeWidth="3" />
    </svg>
  );
}

function CourtHeaderCell({ court }) {
  return (
    <div
      style={{
        textAlign: "center",
        fontFamily: FONT.display,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: "rgba(27,36,34,0.6)",
        padding: "4px 0",
      }}
    >
      코트 {court}
    </div>
  );
}

function LegendDot({ color, border, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: color,
          border: `1px solid ${border}`,
          display: "inline-block",
        }}
      />
      {label}
    </div>
  );
}

function BookingCell({ booking, onClick }) {
  const count = booking ? booking.players.length : 0;
  const full = count >= BOOKING_SLOTS_PER_MATCH;
  const empty = count === 0;
  const cat = booking ? categoryOf(booking.category) : null;

  const bg = empty ? "#fff" : full ? "#3E6FD9" : "#D6E6FB";
  const border = empty ? "rgba(0,0,0,0.15)" : full ? "#3E6FD9" : "#7FA6E0";
  const textColor = full ? "#fff" : C.charcoal;

  return (
    <button
      onClick={onClick}
      style={{
        height: 56,
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: bg,
        color: textColor,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: 4,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700 }}>
        {empty ? "예약 가능" : full ? "마감" : `${BOOKING_SLOTS_PER_MATCH - count}자리 남음`}
      </span>
      {!empty && (
        <span style={{ fontSize: 10, opacity: 0.85, fontFamily: FONT.mono }}>
          {count}/{BOOKING_SLOTS_PER_MATCH}
        </span>
      )}
      {cat && (
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, display: "inline-block" }} />
          {cat.label}
        </span>
      )}
    </button>
  );
}

function JoinModal({
  slot,
  booking,
  players,
  joinPlayerId,
  setJoinPlayerId,
  guestName,
  setGuestName,
  category,
  setCategory,
  duration,
  setDuration,
  availableDurations,
  onJoin,
  onRemove,
  onClose,
}) {
  const count = booking ? booking.players.length : 0;
  const full = count >= BOOKING_SLOTS_PER_MATCH;
  const isNewBooking = !booking;
  const endTime = (() => {
    const idx = TIME_SLOTS.indexOf(slot.time);
    const endIdx = Math.min(idx + duration, TIME_SLOTS.length - 1);
    return TIME_SLOTS[endIdx] || slot.time;
  })();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,21,26,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: "18px 18px 0 0",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Eyebrow>
              {slot.date} · {slot.time}
              {isNewBooking && duration > 1 ? ` – ${endTime}` : ""}
            </Eyebrow>
            <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              코트 {slot.court}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={C.charcoal} />
          </button>
        </div>

        {isNewBooking && (
          <div style={{ marginTop: 14 }}>
            <Eyebrow>예약 시간</Eyebrow>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[1, 2, 3].map((d) => {
                const disabled = !availableDurations.includes(d);
                const active = duration === d;
                return (
                  <button
                    key={d}
                    disabled={disabled}
                    onClick={() => setDuration(d)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid ${active ? C.turf : "rgba(0,0,0,0.15)"}`,
                      background: active ? C.turf : disabled ? "#F1F1EC" : "transparent",
                      color: active ? "#fff" : disabled ? "rgba(0,0,0,0.3)" : C.charcoal,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {d}시간
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {isNewBooking ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1px solid ${category === c.key ? c.color : "rgba(0,0,0,0.15)"}`,
                    background: category === c.key ? c.color : "transparent",
                    color: category === c.key ? "#fff" : C.charcoal,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                background: categoryOf(booking.category).color,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {categoryOf(booking.category).label}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: BOOKING_SLOTS_PER_MATCH }, (_, i) => {
            const p = booking?.players[i];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: p ? C.paperDim : "transparent",
                  border: p ? "none" : "1px dashed rgba(0,0,0,0.2)",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: p ? 700 : 500, color: p ? C.charcoal : "rgba(27,36,34,0.4)" }}>
                  {p ? p.name : `빈 자리 ${i + 1}`}
                </span>
                {p && (
                  <button
                    onClick={() => onRemove(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(27,36,34,0.4)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!full && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Eyebrow>참여하기</Eyebrow>
            {players.length > 0 && (
              <select
                value={joinPlayerId}
                onChange={(e) => {
                  setJoinPlayerId(e.target.value);
                  setGuestName("");
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: 14,
                }}
              >
                <option value="">등록된 선수 선택</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <input
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setJoinPlayerId("");
              }}
              placeholder="또는 이름 직접 입력 (게스트)"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.15)",
                fontSize: 14,
              }}
            />
            <PrimaryButton onClick={onJoin} icon={UserPlus}>
              {isNewBooking ? "예약하기" : "이 시간에 참여"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayersTab({ league, newPlayerName, setNewPlayerName, addPlayer, removePlayer, autoAssignTeams }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>선수 등록</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="이름 입력"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <PrimaryButton onClick={addPlayer} icon={Plus}>
            추가
          </PrimaryButton>
        </div>

        {league.players.length === 0 ? (
          <EmptyHint text="선수를 4명 이상 등록하면 대진표를 만들 수 있어요." />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {league.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px 6px 12px",
                  borderRadius: 999,
                  background: C.paperDim,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {p.name}
                <button
                  onClick={() => removePlayer(p.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "rgba(27,36,34,0.5)" }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
          총 {league.players.length}명 등록됨
        </div>
      </SectionCard>

      {league.format === "round_robin" && (
        <SectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Eyebrow>팀 편성</Eyebrow>
            <PrimaryButton onClick={autoAssignTeams} icon={Shuffle} disabled={league.players.length < 2}>
              자동 팀 편성
            </PrimaryButton>
          </div>
          {league.teams.length === 0 ? (
            <EmptyHint text="선수를 등록한 뒤 자동 팀 편성을 눌러 2인 1팀으로 묶어주세요." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {league.teams.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: C.paperDim,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(27,36,34,0.5)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function ScheduleTab({
  league,
  numRounds,
  setNumRounds,
  generateSchedule,
  updateScore,
  nameOf,
  onGenerateNextMexicanoRound,
  onRemoveLastMexicanoRound,
}) {
  const isMexicano = league.format === "mexicano";
  const isAmericano = league.format === "americano";
  const canGenerate = isAmericano || isMexicano ? league.players.length >= 4 : league.teams.length >= 2;

  const formatDescription = isAmericano
    ? "매 라운드 파트너가 바뀌는 아메리카노 방식이에요."
    : isMexicano
    ? "매 라운드 현재 순위 기준으로 짝을 다시 맞추는 멕시카노 방식이에요."
    : "고정된 팀끼리 한 번씩 맞붙는 라운드로빈 방식이에요.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <Eyebrow>대진표 생성</Eyebrow>
            <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)", marginTop: 4 }}>{formatDescription}</div>
          </div>
          {isAmericano && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              라운드 수
              <input
                type="number"
                min={1}
                max={20}
                value={numRounds}
                onChange={(e) => setNumRounds(Number(e.target.value) || 1)}
                style={{
                  width: 52,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontFamily: FONT.mono,
                  textAlign: "center",
                }}
              />
            </label>
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isMexicano ? (
            <>
              <PrimaryButton
                onClick={league.rounds.length === 0 ? generateSchedule : onGenerateNextMexicanoRound}
                icon={RefreshCw}
                disabled={!canGenerate}
              >
                {league.rounds.length === 0 ? "1라운드 생성" : "다음 라운드 생성"}
              </PrimaryButton>
              {league.rounds.length > 0 && (
                <PrimaryButton
                  onClick={onRemoveLastMexicanoRound}
                  style={{ background: "transparent", color: C.danger, border: `1px solid ${C.danger}` }}
                >
                  마지막 라운드 취소
                </PrimaryButton>
              )}
            </>
          ) : (
            <PrimaryButton onClick={generateSchedule} icon={RefreshCw} disabled={!canGenerate}>
              {league.rounds.length > 0 ? "대진표 다시 생성" : "대진표 생성"}
            </PrimaryButton>
          )}
        </div>

        {isMexicano && league.rounds.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
            다음 라운드는 지금까지 입력된 점수를 기준으로 순위를 다시 계산해 짝을 맞춰요. 이번 라운드 점수를 먼저 입력하세요.
          </div>
        )}

        {!canGenerate && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
            {isAmericano || isMexicano
              ? "선수 · 팀 탭에서 4명 이상 등록해 주세요."
              : "선수 · 팀 탭에서 팀을 2개 이상 편성해 주세요."}
          </div>
        )}
      </SectionCard>

      {league.rounds.length === 0 ? (
        <EmptyHint text="아직 생성된 라운드가 없어요." />
      ) : (
        league.rounds.map((round, ri) => (
          <div key={round.roundNumber}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700 }}>
                ROUND {round.roundNumber}
              </span>
              {round.sitOut && round.sitOut.length > 0 && (
                <span style={{ fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
                  대기: {round.sitOut.map((id) => nameOf(id)).join(", ")}
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {round.matches.map((m) => (
                <CourtMatch
                  key={m.id}
                  match={m}
                  nameOf={nameOf}
                  onScore={(field, value) => updateScore(ri, m.id, field, value)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function StandingsTab({ league, standings, onUploadResultPhoto, onSetResultPhotoUrl, resultPhotoUploading }) {
  const isIndividual = league.format === "americano" || league.format === "mexicano";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>결과 사진</Eyebrow>
        {league.resultPhoto && (
          <img
            src={league.resultPhoto}
            alt="경기 결과"
            style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, marginTop: 10 }}
          />
        )}
        <div style={{ marginTop: 10 }}>
          <PhotoInput
            label={league.resultPhoto ? "사진 교체" : "사진 추가"}
            uploading={resultPhotoUploading}
            onFile={onUploadResultPhoto}
            onSetUrl={onSetResultPhotoUrl}
          />
        </div>
      </SectionCard>

      {standings.length === 0 ? (
        <EmptyHint text="아직 순위 데이터가 없어요. 대진표에서 경기 결과를 입력해 주세요." />
      ) : (
        <SectionCard>
          <Eyebrow>{league.name} · 순위</Eyebrow>
          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.ink}` }}>
                  <Th align="left">#</Th>
                  <Th align="left">{isIndividual ? "선수" : "팀"}</Th>
                  {isIndividual ? (
                    <>
                      <Th>경기</Th>
                      <Th>승</Th>
                      <Th>포인트</Th>
                    </>
                  ) : (
                    <>
                      <Th>경기</Th>
                      <Th>승</Th>
                      <Th>패</Th>
                      <Th>득실차</Th>
                      <Th>승점</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                      background: i < 3 ? "rgba(215,241,59,0.15)" : "transparent",
                    }}
                  >
                    <Td>
                      <span
                        style={{
                          fontFamily: FONT.mono,
                          fontWeight: 700,
                          color: i === 0 ? C.turf : C.charcoal,
                        }}
                      >
                        {i + 1}
                      </span>
                    </Td>
                    <Td align="left">
                      <span style={{ fontWeight: 700 }}>{s.name}</span>
                    </Td>
                    {isIndividual ? (
                      <>
                        <Td>{s.played}</Td>
                        <Td>{s.wins}</Td>
                        <Td>
                          <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>
                            {s.points}
                          </span>
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td>{s.played}</Td>
                        <Td>{s.win}</Td>
                        <Td>{s.loss}</Td>
                        <Td>{s.diff > 0 ? `+${s.diff}` : s.diff}</Td>
                        <Td>
                      <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>
                        {s.pts}
                      </span>
                    </Td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
      )}
    </div>
  );
}
