import { useCallback, useRef, useState } from "react";
import { getCurrentMember, signIn, signOut, signUp } from "@/lib/auth";
import { setAvatarUrl, updateProfileLevel, uploadAvatar } from "@/lib/db";
import type { Contact, Member } from "@/lib/types";
import type { SignUpForm } from "./AuthModal";

export type AuthOutcome = { error: string } | { userId: string; signedIn: boolean };

/* The signed-in member's profile and contact details, plus the actions that change them. */
export function useSession() {
  const [member, setMember] = useState<Member | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  // The id is also kept in a ref so that an action started right after
  // sign-up (uploading the chosen photo) sees the new account at once.
  const memberId = useRef<string | null>(null);

  /* Re-reads the profile from the current auth session; null when signed out. */
  const refresh = useCallback(async () => {
    const current = await getCurrentMember();
    memberId.current = current?.member.id ?? null;
    setMember(current?.member ?? null);
    setContact(current?.contact ?? null);
    return current?.member ?? null;
  }, []);

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
    memberId.current = null;
    setMember(null);
    setContact(null);
  }, []);

  const patchMember = (changes: Partial<Member>) => setMember((prev) => prev && { ...prev, ...changes });

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

  const isAdmin = member?.role === "owner" || member?.role === "admin";

  return {
    member,
    contact,
    isAdmin,
    profileUploading,
    refresh,
    signUp: register,
    logIn,
    logOut,
    updatePhoto,
    updatePhotoUrl,
    updateLevel,
  };
}
