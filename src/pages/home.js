import { initData, getData, getRecentStudyStats } from '../core/storage.js';
import { supabase, signIn, signOut, signUp, getCurrentUser } from '../core/supabase.js';

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loading = document.getElementById('loading-message');
const authMessage = document.getElementById('auth-message');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

function setAuthMessage(message, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = message || '';
  authMessage.style.color = isError ? '#ffd4dc' : '';
}

function showAuth() {
  authScreen?.classList.remove('hidden');
  appScreen?.classList.add('hidden');
}

function showApp() {
  authScreen?.classList.add('hidden');
  appScreen?.classList.remove('hidden');
}

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 3)}***@${domain}`;
}

function renderStats() {
  const data = getData();
  const recent = getRecentStudyStats(10);
  document.getElementById('bookCount').textContent = String(data.books.length);
  document.getElementById('sectionCount').textContent = String(data.sections.length);
  document.getElementById('wordCount').textContent = String(data.words.length);
  document.getElementById('recordCount').textContent = `최근 ${recent.total}문제 · 정확도 ${recent.accuracy}%`;
}

async function refresh() {
  loading?.classList.remove('hidden');
  const user = await getCurrentUser();
  if (user) {
    await initData();
    renderStats();
    document.getElementById('user-info').textContent = `로그인됨 · ${maskEmail(user.email)}`;
    showApp();
  } else {
    showAuth();
  }
  loading?.classList.add('hidden');
}

loginBtn?.addEventListener('click', async () => {
  try {
    setAuthMessage('');
    await signIn(emailInput.value.trim(), passwordInput.value);
    await refresh();
  } catch (error) {
    setAuthMessage(error.message || '로그인에 실패했습니다.', true);
  }
});

signupBtn?.addEventListener('click', async () => {
  try {
    setAuthMessage('');
    await signUp(emailInput.value.trim(), passwordInput.value);
    setAuthMessage('회원가입 요청이 완료되었습니다. 이메일 인증이 필요할 수 있습니다.');
  } catch (error) {
    setAuthMessage(error.message || '회원가입에 실패했습니다.', true);
  }
});

logoutBtn?.addEventListener('click', async () => {
  await signOut();
  location.reload();
});

supabase.auth.onAuthStateChange(() => {
  refresh();
});

refresh();
