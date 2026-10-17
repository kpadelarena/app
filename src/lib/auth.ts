import type { Session, User } from "@supabase/supabase-js";
import { toMember } from "./db";
import { supabase } from "./supabaseClient";
import type { Contact, Member } from "./types";

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  level: number;
  phone?: string;
}

export type AuthResult =
  | { user: User; session: Session | null; error?: undefined }
  | { error: { message: string }; user?: undefined; session?: undefined };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/* The profile and contact rows are created by a database trigger on
   sign-up, from the metadata passed here. */
export async function signUp({ email, password, displayName, level, phone }: SignUpInput): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { data: { display_name: displayName, level, phone: phone || "" } },
  });
  if (error) return { error };
  if (!data.user) return { error: { message: "signup_no_user" } };
  return { user: data.user, session: data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) return { error: { message: "invalid_credentials" } };
  return { user: data.user, session: data.session };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/* The signed-in member's profile and contact details, or null when signed out. */
export async function getCurrentMember(): Promise<{ member: Member; contact: Contact } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const [{ data: profile }, { data: contact }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.from("profile_contacts").select("email, phone").eq("id", session.user.id).maybeSingle(),
  ]);
  if (!profile) return null;
  return {
    member: toMember(profile),
    contact: { email: contact?.email ?? session.user.email ?? null, phone: contact?.phone ?? null },
  };
}
