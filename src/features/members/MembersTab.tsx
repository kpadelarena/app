import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserCircle } from "lucide-react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { ROLES, roleLabel } from "@/features/club/constants";
import { getContacts, getMembers, updateMemberRole } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { Member, Role } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";

const dim = "rgba(27,36,34,0.55)";
const RANK: Record<Role, number> = { owner: 0, admin: 1, member: 2 };

const badgeStyle = (role: Role) =>
  ({
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: role === "member" ? C.paperDim : role === "owner" ? C.ink : C.turf,
    color: role === "member" ? dim : "#fff",
  }) as const;

interface MembersTabProps {
  member: Member | null;
  /** Admins also see contact details. */
  isAdmin: boolean;
  /** Owners change roles. */
  isOwner: boolean;
  onOpenAuth: () => void;
}

/* Everyone who has signed up, owners and admins first. */
export function MembersTab({ member, isAdmin, isOwner, onOpenAuth }: MembersTabProps) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState(false);

  const { data: members } = useQuery({ queryKey: queryKeys.members, queryFn: getMembers, enabled: !!member });
  const { data: contacts = {} } = useQuery({ queryKey: queryKeys.contacts, queryFn: getContacts, enabled: isAdmin });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateMemberRole(id, role),
    onSuccess: () => setSaveError(false),
    onError: () => setSaveError(true),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members });
      // The viewer's own role may have changed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });

  if (!member) {
    return (
      <SectionCard>
        <Eyebrow>회원</Eyebrow>
        <EmptyHint text="회원가입 또는 로그인을 하면 회원 목록을 볼 수 있어요." />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onOpenAuth}>회원가입 · 로그인</PrimaryButton>
        </div>
      </SectionCard>
    );
  }

  const sorted = [...(members ?? [])].sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>회원</Eyebrow>
          <span style={{ fontSize: 12, color: dim }}>{sorted.length}명</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {sorted.map((m) => {
            const contact = contacts[m.id];
            const detail = [contact?.phone, contact?.email].filter(Boolean).join(" · ");
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: C.paperDim,
                }}
              >
                {m.photo ? (
                  <img
                    src={m.photo}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <UserCircle size={32} color="rgba(27,36,34,0.35)" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
                    {m.name}
                    {m.id === member.id && <span style={{ fontSize: 11, fontWeight: 600, color: dim }}>나</span>}
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: C.turf }}>
                      Lv.{m.level.toFixed(1)}
                    </span>
                  </div>
                  {detail && (
                    <div style={{ fontSize: 12, color: dim, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {detail}
                    </div>
                  )}
                </div>
                {isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => setRole.mutate({ id: m.id, role: e.target.value as Role })}
                    aria-label={`${m.name} 역할`}
                    style={{
                      padding: "5px 8px",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.15)",
                      fontSize: 12,
                      fontWeight: 700,
                      background: "#fff",
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={badgeStyle(m.role)}>{roleLabel(m.role)}</span>
                )}
              </div>
            );
          })}
        </div>
        {isOwner && (
          <div style={{ marginTop: 10, fontSize: 12, color: dim }}>
            운영자는 역할을 바꿀 수 있어요. 마지막 운영자는 강등할 수 없어요.
          </div>
        )}
        {isAdmin && !isOwner && (
          <div style={{ marginTop: 10, fontSize: 12, color: dim }}>역할 변경은 운영자만 할 수 있어요.</div>
        )}
      </SectionCard>
      {saveError && (
        <div style={{ textAlign: "center", fontSize: 12, color: C.danger }}>
          역할 변경에 실패했어요. 마지막 운영자는 강등할 수 없어요.
        </div>
      )}
    </div>
  );
}
