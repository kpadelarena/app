import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { getCurrentMember, signIn, signOut, signUp } from "@/lib/auth";
import { setAvatarUrl, updateProfileLevel, uploadAvatar } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabaseClient";
import type { Member } from "@/lib/types";
import type { SignUpForm } from "./AuthModal";

export type AuthOutcome = { error: string } | { userId: string; signedIn: boolean };

type Session = Awaited<ReturnType<typeof getCurrentMember>>;

/* The signed-in member's profile and contact details, plus the actions that change them. */
export function useSession() {
  const queryClient = useQueryClient();
  const [profileUploading, setProfileUploading] = useState(false);

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: getCurrentMember,
    // Only auth events and the actions below change it.
    staleTime: Infinity,
  });
  const member = sessionQuery.data?.member ?? null;
  const contact = sessionQuery.data?.contact ?? null;

  // Everything else is re-read on sign-in/out: what a visitor may see
  // depends on who they are (booking participants, league rosters, ...).
  const invalidateMemberData = useCallback(() => {
    void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.session[0] });
  }, [queryClient]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
      invalidateMemberData();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, invalidateMemberData]);

  /* Re-reads the session now and returns it. */
  const refresh = useCallback(async () => {
    const current = await queryClient.fetchQuery({
      queryKey: queryKeys.session,
      queryFn: getCurrentMember,
      staleTime: 0,
    });
    invalidateMemberData();
    return current;
  }, [queryClient, invalidateMemberData]);

  const register = useCallback(
    async (form: SignUpForm): Promise<AuthOutcome> => {
      const result = await signUp({
        email: form.email,
        password: form.password,
        displayName: form.name,
        level: form.level,
        phone: form.phone,
      });
      if (result.error) return { error: result.error.message };
      // With email confirmation on, there is no session until the link is clicked.
      const signedIn = !!(await refresh());
      return { userId: result.user.id, signedIn };
    },
    [refresh],
  );

  const logIn = useCallback(
    async (email: string, password: string): Promise<AuthOutcome> => {
      const result = await signIn(email, password);
      if (result.error) return { error: result.error.message };
      await refresh();
      return { userId: result.user.id, signedIn: true };
    },
    [refresh],
  );

  const logOut = useCallback(async () => {
    await signOut();
    queryClient.setQueryData<Session>(queryKeys.session, null);
    invalidateMemberData();
  }, [queryClient, invalidateMemberData]);

  /* The current member id straight from the cache, so an action started
     right after sign-up (uploading the chosen photo) sees the new account. */
  const currentMemberId = useCallback(
    () => queryClient.getQueryData<Session>(queryKeys.session)?.member.id ?? null,
    [queryClient],
  );

  const patchMember = useCallback(
    (changes: Partial<Member>) =>
      queryClient.setQueryData<Session>(queryKeys.session, (prev) =>
        prev ? { ...prev, member: { ...prev.member, ...changes } } : prev,
      ),
    [queryClient],
  );

  const updatePhoto = useCallback(
    async (file: File) => {
      const id = currentMemberId();
      if (!id) return;
      setProfileUploading(true);
      try {
        patchMember({ photo: await uploadAvatar(id, file) });
      } catch {
        // couldn't read/upload the file
      } finally {
        setProfileUploading(false);
      }
    },
    [currentMemberId, patchMember],
  );

  /* Profile edits apply locally at once; saving is best effort. */
  const updatePhotoUrl = useCallback(
    (url: string) => {
      const id = currentMemberId();
      if (!id) return;
      patchMember({ photo: url });
      setAvatarUrl(id, url).catch(() => {});
    },
    [currentMemberId, patchMember],
  );

  const updateLevel = useCallback(
    (level: number) => {
      const id = currentMemberId();
      if (!id) return;
      patchMember({ level });
      updateProfileLevel(id, level).catch(() => {});
    },
    [currentMemberId, patchMember],
  );

  const isAdmin = member?.role === "owner" || member?.role === "admin";

  return {
    member,
    contact,
    isAdmin,
    isLoading: sessionQuery.isPending,
    profileUploading,
    signUp: register,
    logIn,
    logOut,
    updatePhoto,
    updatePhotoUrl,
    updateLevel,
  };
}
