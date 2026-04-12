import { supabase, getCurrentUser } from "../../assets/js/auth.js";
import { store } from "../store.js";

export const DEFAULT_PUBLIC_AVATAR = "assets/images/260093543.png";
const AVATARS_BUCKET = "avatars";
const PROFILE_TABLE = "user_public_profiles";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildDisplayName({ firstName = "", lastName = "", email = "" } = {}) {
  const fullName = [safeString(firstName), safeString(lastName)].filter(Boolean).join(" ").trim();
  return fullName || safeString(email) || "Utilisateur";
}

function buildDefaultProfile(user) {
  const email = safeString(user?.email || store.user?.email || "");
  const firstName = safeString(user?.user_metadata?.first_name || store.user?.firstName || "");
  const lastName = safeString(user?.user_metadata?.last_name || store.user?.lastName || "");
  const publicEmail = email;

  return {
    user_id: safeString(user?.id || store.user?.id || ""),
    first_name: firstName,
    last_name: lastName,
    public_email: publicEmail,
    bio: "",
    company: "",
    avatar_storage_path: ""
  };
}

async function resolveAvatarUrl(avatarStoragePath) {
  const cleanPath = safeString(avatarStoragePath);
  if (!cleanPath) return DEFAULT_PUBLIC_AVATAR;

  const { data, error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);

  if (error || !safeString(data?.signedUrl)) {
    console.warn("resolveAvatarUrl failed", error);
    return DEFAULT_PUBLIC_AVATAR;
  }

  return data.signedUrl;
}

function mergeStoreUserWithProfile(profile, avatarUrl) {
  const nextFirstName = safeString(profile?.first_name || store.user?.firstName || "");
  const nextLastName = safeString(profile?.last_name || store.user?.lastName || "");
  const nextEmail = safeString(store.user?.email || profile?.public_email || "");
  const nextName = buildDisplayName({
    firstName: nextFirstName,
    lastName: nextLastName,
    email: nextEmail
  });

  store.user = {
    ...(store.user || {}),
    firstName: nextFirstName,
    lastName: nextLastName,
    name: nextName,
    avatar: safeString(avatarUrl) || DEFAULT_PUBLIC_AVATAR,
    publicProfile: {
      firstName: nextFirstName,
      lastName: nextLastName,
      publicEmail: safeString(profile?.public_email || ""),
      bio: safeString(profile?.bio || ""),
      company: safeString(profile?.company || ""),
      avatarStoragePath: safeString(profile?.avatar_storage_path || "")
    }
  };

  return store.user;
}

export async function fetchCurrentUserPublicProfile() {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("user_id, first_name, last_name, public_email, bio, company, avatar_storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function hydrateStoreUserPublicProfile() {
  const user = await getCurrentUser();
  if (!user?.id) return store.user;

  let profile = await fetchCurrentUserPublicProfile();

  if (!profile) {
    profile = buildDefaultProfile(user);
    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .upsert(profile, { onConflict: "user_id" })
      .select("user_id, first_name, last_name, public_email, bio, company, avatar_storage_path")
      .single();

    if (error) throw error;
    profile = data;
  }

  const avatarUrl = await resolveAvatarUrl(profile.avatar_storage_path);
  return mergeStoreUserWithProfile(profile, avatarUrl);
}

export async function saveCurrentUserPublicProfile({ firstName = "", lastName = "", publicEmail = "", bio = "", company = "" } = {}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Utilisateur non authentifié.");
  }

  const payload = {
    user_id: user.id,
    first_name: safeString(firstName),
    last_name: safeString(lastName),
    public_email: safeString(publicEmail),
    bio: safeString(bio),
    company: safeString(company),
    avatar_storage_path: safeString(store.user?.publicProfile?.avatarStoragePath || "")
  };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id, first_name, last_name, public_email, bio, company, avatar_storage_path")
    .single();

  if (error) throw error;

  return mergeStoreUserWithProfile(data, safeString(store.user?.avatar) || DEFAULT_PUBLIC_AVATAR);
}

export async function uploadCurrentUserAvatar(fileOrBlob) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Utilisateur non authentifié.");
  }

  const storagePath = `${user.id}/avatar.png`;
  const uploadFile = fileOrBlob instanceof Blob
    ? fileOrBlob
    : new Blob([fileOrBlob], { type: "image/png" });

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(storagePath, uploadFile, {
      upsert: true,
      contentType: "image/png",
      cacheControl: "3600"
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert({
      user_id: user.id,
      first_name: safeString(store.user?.publicProfile?.firstName || store.user?.firstName || user.user_metadata?.first_name || ""),
      last_name: safeString(store.user?.publicProfile?.lastName || store.user?.lastName || user.user_metadata?.last_name || ""),
      public_email: safeString(store.user?.publicProfile?.publicEmail || store.user?.email || ""),
      bio: safeString(store.user?.publicProfile?.bio || ""),
      company: safeString(store.user?.publicProfile?.company || ""),
      avatar_storage_path: storagePath
    }, { onConflict: "user_id" })
    .select("user_id, first_name, last_name, public_email, bio, company, avatar_storage_path")
    .single();

  if (error) throw error;

  const avatarUrl = await resolveAvatarUrl(storagePath);
  return mergeStoreUserWithProfile(data, avatarUrl);
}

export async function removeCurrentUserAvatar() {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Utilisateur non authentifié.");
  }

  const currentPath = safeString(store.user?.publicProfile?.avatarStoragePath || "");
  if (currentPath) {
    const { error: removeError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .remove([currentPath]);

    if (removeError) throw removeError;
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert({
      user_id: user.id,
      first_name: safeString(store.user?.publicProfile?.firstName || store.user?.firstName || user.user_metadata?.first_name || ""),
      last_name: safeString(store.user?.publicProfile?.lastName || store.user?.lastName || user.user_metadata?.last_name || ""),
      public_email: safeString(store.user?.publicProfile?.publicEmail || store.user?.email || ""),
      bio: safeString(store.user?.publicProfile?.bio || ""),
      company: safeString(store.user?.publicProfile?.company || ""),
      avatar_storage_path: ""
    }, { onConflict: "user_id" })
    .select("user_id, first_name, last_name, public_email, bio, company, avatar_storage_path")
    .single();

  if (error) throw error;

  return mergeStoreUserWithProfile(data, DEFAULT_PUBLIC_AVATAR);
}
