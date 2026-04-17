import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://rugltqwtvoghzusvqsit.supabase.co";
const SUPABASE_KEY = "sb_publishable_LH0xPgV4f_RFD_RcSYEUiw_6TZWzB-R";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://sea-anemone17.github.io/VOCAQuest/"
    }
  });

  if (error) {
    alert(error.message);
    return null;
  }

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return null;
  }

  return data;
}

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("현재 사용자 조회 실패:", error);
    return null;
  }

  return data?.user?.id ?? null;
}
