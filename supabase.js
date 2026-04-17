import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://rugltqwtvoghzusvqsit.supabase.co";
const SUPABASE_KEY = "sb_publishable_LH0xPgV4f_RFD_RcSYEUiw_6TZWzB-R";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
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
  const { data } = await supabase.auth.getUser();

  return data?.user?.id ?? null;
}
