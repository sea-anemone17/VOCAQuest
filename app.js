import { initData, getData, getRecentStudyStats } from "./storage.js";
import { supabase, signUp, signIn, getCurrentUserId } from "./supabase.js";

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authMessage = document.getElementById("auth-message");

function showAuthScreen() {
  if (authScreen) authScreen.style.display = "block";
  if (appScreen) appScreen.style.display = "none";
}

function showAppScreen() {
  if (authScreen) authScreen.style.display = "none";
  if (appScreen) appScreen.style.display = "block";
}

function renderStats() {
  const data = getData();
  const recentStats = getRecentStudyStats();

  const bookCount = document.getElementById("bookCount");
  const sectionCount = document.getElementById("sectionCount");
  const wordCount = document.getElementById("wordCount");
  const recordCount = document.getElementById("recordCount");

  if (bookCount) bookCount.textContent = data.books.length;
  if (sectionCount) sectionCount.textContent = data.sections.length;
  if (wordCount) wordCount.textContent = data.words.length;
  if (recordCount) {
    recordCount.textContent = `최근 ${recentStats.total}문제 · 정확도 ${recentStats.accuracy}%`;
  }
}

async function showUserInfo() {
  const { data } = await supabase.auth.getUser();
  const el = document.getElementById("user-info");

  if (data?.user && el) {
    el.textContent = `로그인: ${data.user.email}`;
  }
}

async function initApp() {
  await initData();
  renderStats();
  await showUserInfo();
}

async function refreshAuthState() {
  const loading = document.getElementById("loading-message");
  if (loading) loading.style.display = "block";

  const userId = await getCurrentUserId();

  if (userId) {
    showAppScreen();
    await initApp();
  } else {
    showAuthScreen();
  }

  if (loading) loading.style.display = "none";
}

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value?.trim();

    if (!email || !password) {
      if (authMessage) authMessage.textContent = "이메일과 비밀번호를 입력해 주세요.";
      return;
    }

    const result = await signUp(email, password);

    if (result) {
      if (authMessage) {
        authMessage.textContent = "회원가입이 완료되었습니다. 이메일 인증이 필요할 수 있습니다.";
      }
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value?.trim();

    if (!email || !password) {
      if (authMessage) authMessage.textContent = "이메일과 비밀번호를 입력해 주세요.";
      return;
    }

    const result = await signIn(email, password);

    if (result) {
      if (authMessage) authMessage.textContent = "";
      await refreshAuthState();
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload();
  });
}

refreshAuthState();
