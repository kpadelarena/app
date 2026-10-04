import { useCallback, useRef, useState } from "react";
import { getCurrentProfile, signInWithUsername, signOut, signUpWithUsername } from "@/lib/auth";
import { setAvatarUrl, updateProfileLevel, uploadAvatar } from "@/lib/db";
import type { Member, ProfileRow } from "@/lib/types";
import type { SignUpForm } from "./AuthModal";

const toMember = (row: ProfileRow): Member => ({
  id: row.id,
  name: row.display_name,
  username: row.username,
  level: row.level ?? 3,
  photo: row.photo_url,
  region: row.region,
  email: row.email,
  phone: row.phone,
  gender: row.gender,
});

export type AuthOutcome = { error: string } | { userId: string };

/* The signed-in member's profile, plus the actions that change it. */
export function useSession() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  // The id is also kept in a ref so that an action started right after
  // sign-up (uploading the chosen photo) sees the new account at once.
  const memberId = useRef<string | null>(null);

  /* Re-reads the profile from the current auth session; null when signed out. */
  const refresh = useCallback(async () => {
    const profile = await getCurrentProfile();
    const member = profile ? toMember(profile) : null;
    memberId.current = member?.id ?? null;
    setCurrentMember(member);
    return member;
  }, []);

  const signUp = useCallback(
    async ({ photo, ...form }: SignUpForm): Promise<AuthOutcome> => {
      const result = await signUpWithUsername({ ...form, photoUrl: photo });
      if (result.error) return { error: result.error.message };
      await refresh();
      return { userId: result.user.id };
    },
    [refresh],
  );

  const logIn = useCallback(
    async (username: string, password: string): Promise<AuthOutcome> => {
      const result = await signInWithUsername(username, password);
      if (result.error) return { error: result.error.message };
      await refresh();
      return { userId: result.user.id };
    },
    [refresh],
  );

  const logOut = useCallback(async () => {
    await signOut();
    memberId.current = null;
    setCurrentMember(null);
  }, []);

  const patchMember = (changes: Partial<Member>) => setCurrentMember((prev) => prev && { ...prev, ...changes });

  const updatePhoto = useCallback(async (file: File) => {
    const id = memberId.current;
    if (!id) return;
    setProfileUploading(true);
    try {
      patchMember({ photo: await uploadAvatar(id, file) });
    } catch {
      // couldn't read/upload the file
    } finally {
      setProfileUploading(false);
    }
  }, []);

  /* Profile edits apply locally at once; saving is best effort. */
  const updatePhotoUrl = useCallback((url: string) => {
    if (!memberId.current) return;
    patchMember({ photo: url });
    setAvatarUrl(memberId.current, url).catch(() => {});
  }, []);

  const updateLevel = useCallback((level: number) => {
    if (!memberId.current) return;
    patchMember({ level });
    updateProfileLevel(memberId.current, level).catch(() => {});
  }, []);

  return { currentMember, profileUploading, refresh, signUp, logIn, logOut, updatePhoto, updatePhotoUrl, updateLevel };
}
