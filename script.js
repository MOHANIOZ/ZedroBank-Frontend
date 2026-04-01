/* ─── CONFIG ─────────────────────────────── */
const BASE = 'https://zedrobank.onrender.com';

/* ─── STATE ──────────────────────────────── */
let token   = localStorage.getItem('zb_tok') || '';
let uname   = localStorage.getItem('zb_usr') || '';
let myAccId = null;

/* ─── INIT ───────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('pageLoader').classList.add('hidden');
    token
      ? showApp()
      : document.getElementById('authPage').classList.add('visible');
  }, 1000);
});

/* ─── TOAST ──────────────────────────────── */
function toast(title, msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const hub = document.getElementById('toastHub');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div>
      ${title ? `<div class="toast-title">${esc(title)}</div>` : ''}
      ${msg   ? `<div class="toast-msg">${esc(msg)}</div>`   : ''}
    </div>`;
  hub.appendChild(t);
  setTimeout(() => { t.style.cssText = 'opacity:0;transform:translateX(30px);transition:.35s'; }, 3500);
  setTimeout(() => t.remove(), 3900);
}

/* ─── MODAL ──────────────────────────────── */
function confirm2(title, msg, cb) {
  document.getElementById('cTitle').textContent = title;
  document.getElementById('cMsg').textContent   = msg;
  document.getElementById('cModal').classList.add('open');
  document.getElementById('cConfirm').onclick = () => { closeModal(); cb(); };
}
function closeModal() {
  document.getElementById('cModal').classList.remove('open');
}

/* ─── AUTH TABS ──────────────────────────── */
function authTab(w) {
  document.getElementById('tabL').classList.toggle('on', w === 'login');
  document.getElementById('tabR').classList.toggle('on', w === 'reg');
  document.getElementById('fL').style.display = w === 'login' ? 'block' : 'none';
  document.getElementById('fR').style.display = w === 'reg'   ? 'block' : 'none';
}

/* ─── FETCH HELPER ───────────────────────── */
async function api(path, opts = {}) {
  const hdrs = { 'Content-Type': 'application/json' };
  if (token) hdrs['Authorization'] = `Bearer ${token}`;
  let res, data;
  try {
    res  = await fetch(`${BASE}${path}`, { ...opts, headers: { ...hdrs, ...(opts.headers || {}) } });
    try { data = await res.json(); } catch (_) { data = null; }
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
  return { ok: res.ok, status: res.status, data };
}

/* ─── LOGIN ──────────────────────────────── */
async function doLogin() {
  const u = document.getElementById('lU').value.trim();
  const p = document.getElementById('lP').value.trim();

  if (!u || !p) {
    toast('Missing fields', 'Please enter both username and password', 'warning');
    return;
  }

  const btn = document.getElementById('btnL');
  load(btn, true);

  try {
    const response = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });

    if (response.ok) {
      const data = await response.json();

      // ✅ Store JWT token for all subsequent API calls
      token = data.token;
      localStorage.setItem('zb_tok', data.token);
      localStorage.setItem('zb_usr', data.username || u);
      uname = data.username || u;

      load(btn, false, 'Sign In →');
      toast('Welcome back!', `Successfully signed in as ${uname}`);
      showApp();

    } else {
      load(btn, false, 'Sign In →');
      const errData = await response.json().catch(() => ({}));
      toast('Login failed', errData.error || 'Invalid username or password.', 'error');
    }

  } catch (error) {
    load(btn, false, 'Sign In →');
    console.error('Login error:', error);
    toast('Connection Error', 'Cannot connect to the server.', 'error');
  }
}

/* ─── REGISTER ───────────────────────────── */
async function doRegister() {
  const name = g('rN'), u = g('rU'), p = g('rP');
  if (!name || !u || !p) { toast('Missing fields', 'Fill all fields', 'warning'); return; }
  if (p.length < 4)      { toast('Weak password', 'Use at least 4 characters', 'warning'); return; }

  const btn = document.getElementById('btnR');
  load(btn, true);

  const r = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: u, password: p, name, accountHolderName: name })
  });

  load(btn, false, 'Create Account →');

  if (r.ok) {
    toast('Account created!', 'You can now sign in');
    authTab('login');
    document.getElementById('lU').value = u;
  } else {
    toast('Registration failed', r.data?.error || r.data?.message || 'Try a different username', 'error');
  }
}

/* ─── LOGOUT ─────────────────────────────── */
function doLogout() {
  confirm2('Sign Out', 'Are you sure you want to sign out?', () => {
    token = ''; uname = ''; myAccId = null;
    localStorage.removeItem('zb_tok');
    localStorage.removeItem('zb_usr');
    document.getElementById('appPage').classList.remove('visible');
    document.getElementById('authPage').classList.add('visible');
    toast('Signed out', 'See you again!');
  });
}

/* ─── SHOW APP ───────────────────────────── */
function showApp() {
  document.getElementById('authPage').classList.remove('visible');
  document.getElementById('appPage').classList.add('visible');
  document.getElementById('sbNm').textContent = uname;
  document.getElementById('sbAv').textContent = uname.charAt(0).toUpperCase();
  document.getElementById('wNm').textContent  = uname;
  go('dashboard');
}

/* ─── NAVIGATION ─────────────────────────── */
function go(page) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  const pg = document.getElementById(`pg-${page}`);
  const nb = document.getElementById(`nb-${page}`);
  if (pg) pg.classList.add('on');
  if (nb) nb.classList.add('on');
  const loaders = {
    dashboard:  loadDash,
    myaccount:  loadMyAcc,
    transactions: loadTx,
    accounts:   loadAllAccs
  };
  if (loaders[page]) loaders[page]();
}

/* ─── HELPERS ────────────────────────────── */
function g(id) {
  return (document.getElementById(id)?.value || '').trim();
}
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function rupee(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt)
    ? String(d)
    : dt.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
}
function load(btn, on, label = '') {
  if (!btn) return;
  btn.disabled = on;
  btn.innerHTML = on ? `<span class="spin"></span> Loading…` : label;
}
function showRes(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  el.classList.add('show');
}

/* ─── DASHBOARD ──────────────────────────── */
async function loadDash() {
  const r = await api('/api/v1/accounts/my-account');
  if (r.ok && r.data) {
    const a = r.data;
    myAccId = a.id;
    document.getElementById('dNm').textContent  = esc(a.accountHolderName || uname);
    document.getElementById('dBal').textContent = rupee(a.balance);
    document.getElementById('dId').textContent  = a.id;
    document.getElementById('wNm').textContent  = esc(a.accountHolderName || uname);
  } else {
    document.getElementById('dNm').textContent  = uname;
    document.getElementById('dBal').textContent = 'No account';
    document.getElementById('dId').textContent  = '—';
  }
  loadRecentTx();
}

async function loadRecentTx() {
  const el = document.getElementById('dTx');
  const r  = await api('/api/v1/accounts/my-transactions');
  if (!r.ok || !Array.isArray(r.data) || !r.data.length) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">📋</span>No transactions yet</div>`;
    return;
  }
  el.innerHTML = txTable(r.data.slice(0, 6));
}

/* ─── MY ACCOUNT ─────────────────────────── */
async function loadMyAcc() {
  const el = document.getElementById('myAccA');
  el.innerHTML = `<div class="empty"><span class="spin" style="width:22px;height:22px;border-width:3px;"></span></div>`;

  const r = await api('/api/v1/accounts/my-account');
  if (!r.ok || !r.data) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">💳</span>No account linked. Create one in Admin Tools.</div>`;
    return;
  }

  const a = r.data;
  myAccId = a.id;
  el.innerHTML = `
    <div class="acc-card">
      <div class="acc-label">Account Holder</div>
      <div class="acc-name">${esc(a.accountHolderName || '—')}</div>
      <div class="acc-bal-label">Current Balance</div>
      <div class="acc-balance">${rupee(a.balance)}</div>
      <div class="acc-meta">
        <div class="acc-chip">Account ID: <span>${a.id}</span></div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat">
        <div class="stat-bar sb-blue"></div>
        <div class="stat-lbl">Account ID</div>
        <div class="stat-val" style="font-size:21px;">#${a.id}</div>
      </div>
      <div class="stat">
        <div class="stat-bar sb-green"></div>
        <div class="stat-lbl">Balance</div>
        <div class="stat-val" style="font-size:19px;">${rupee(a.balance)}</div>
      </div>
    </div>`;
}

async function confirmDelMe() {
  confirm2(
    '⚠️ Delete My Account',
    'This permanently deletes YOUR account and all linked data. This CANNOT be undone!',
    async () => {
      const r = await api('/api/v1/accounts/delete-me', { method: 'DELETE' });
      if (r.ok) {
        toast('Account deleted', 'Your account has been removed');
        doLogout();
      } else {
        toast('Delete failed', r.data?.message || 'Could not delete', 'error');
      }
    }
  );
}

/* ─── TRANSACTIONS ───────────────────────── */
async function loadTx() {
  const el = document.getElementById('txA');
  el.innerHTML = `<div class="empty"><span class="spin" style="width:22px;height:22px;border-width:3px;"></span></div>`;

  const r = await api('/api/v1/accounts/my-transactions');
  if (!r.ok || !Array.isArray(r.data) || !r.data.length) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">📋</span>No transactions found</div>`;
    return;
  }
  el.innerHTML = txTable(r.data);
}

function txTable(list) {
  const rows = list.map(tx => {
    const type     = String(tx.transactionType || tx.type || '').toLowerCase();
    const isCredit = type.includes('credit') || type.includes('deposit');
    const isTransfer = type.includes('transfer');

    const badge = isCredit
      ? `<span class="badge b-green">↑ Credit</span>`
      : isTransfer
      ? `<span class="badge b-blue">⇄ Transfer</span>`
      : `<span class="badge b-red">↓ Debit</span>`;

    const amt  = tx.amount || tx.transactionAmount || 0;
    const cls  = isCredit ? 'v-green' : isTransfer ? 'v-blue' : 'v-red';
    const sign = isCredit ? '+' : isTransfer ? '⇄' : '-';

    return `<tr>
      <td>${badge}</td>
      <td class="${cls}" style="font-weight:600;">${sign}${rupee(amt)}</td>
      <td style="color:var(--text2);font-size:12.5px;">${esc(tx.description || tx.transactionDescription || '—')}</td>
      <td style="color:var(--text2);font-size:12px;">${fmtDate(tx.transactionDate || tx.date || tx.createdAt || tx.timestamp)}</td>
    </tr>`;
  }).join('');

  return `
    <table>
      <thead>
        <tr><th>Type</th><th>Amount</th><th>Description</th><th>Date</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* ─── DEPOSIT ────────────────────────────── */
async function doDeposit() {
  const id = g('depId'), amt = g('depAmt');
  if (!id || !amt || Number(amt) <= 0) {
    toast('Invalid input', 'Enter valid account ID and positive amount', 'warning');
    return;
  }

  const btn = document.getElementById('btnDep');
  load(btn, true);

  // ✅ Send amount as JSON body, not query param
  const r = await api(`/api/v1/accounts/${id}/deposit`, {
    method: 'PUT',
    body: JSON.stringify({ amount: Number(amt) })
  });

  load(btn, false, '💰 Deposit');

  if (r.ok && r.data) {
    toast('Deposit successful!', `${rupee(amt)} added to account #${id}`);
    showRes('depR', `
      <div class="rrow"><span class="k">Account ID</span><span class="v v-blue">#${r.data.id}</span></div>
      <div class="rrow"><span class="k">Account Holder</span><span class="v">${esc(r.data.accountHolderName)}</span></div>
      <div class="rrow"><span class="k">Deposited</span><span class="v v-green">+${rupee(amt)}</span></div>
      <div class="rrow"><span class="k">New Balance</span><span class="v v-green">${rupee(r.data.balance)}</span></div>`);
    document.getElementById('depAmt').value = '';
  } else {
    toast('Deposit failed', r.data?.message || 'Something went wrong', 'error');
  }
}

/* ─── WITHDRAW ───────────────────────────── */
async function doWithdraw() {
  const id = g('wdId'), amt = g('wdAmt');
  if (!id || !amt || Number(amt) <= 0) {
    toast('Invalid input', 'Enter valid account ID and positive amount', 'warning');
    return;
  }

  const btn = document.getElementById('btnWd');
  load(btn, true);

  // ✅ Send amount as JSON body, not query param
  const r = await api(`/api/v1/accounts/${id}/withdraw`, {
    method: 'PUT',
    body: JSON.stringify({ amount: Number(amt) })
  });

  load(btn, false, '💸 Withdraw');

  if (r.ok && r.data) {
    toast('Withdrawal successful!', `${rupee(amt)} withdrawn from account #${id}`);
    showRes('wdR', `
      <div class="rrow"><span class="k">Account ID</span><span class="v v-blue">#${r.data.id}</span></div>
      <div class="rrow"><span class="k">Account Holder</span><span class="v">${esc(r.data.accountHolderName)}</span></div>
      <div class="rrow"><span class="k">Withdrawn</span><span class="v v-red">-${rupee(amt)}</span></div>
      <div class="rrow"><span class="k">Remaining Balance</span><span class="v v-green">${rupee(r.data.balance)}</span></div>`);
    document.getElementById('wdAmt').value = '';
  } else {
    toast('Withdrawal failed', r.data?.message || 'Insufficient funds or invalid account', 'error');
  }
}

/* ─── TRANSFER ───────────────────────────── */
async function doTransfer() {
  const fr = g('tfFr'), to = g('tfTo'), amt = g('tfAmt');
  if (!fr || !to || !amt || Number(amt) <= 0) {
    toast('Invalid input', 'Fill all transfer fields correctly', 'warning');
    return;
  }
  if (fr === to) {
    toast('Same account', 'From and To must be different accounts', 'warning');
    return;
  }

  const btn = document.getElementById('btnTf');
  load(btn, true);

  const r = await api('/api/v1/accounts/transfer', {
    method: 'POST',
    body: JSON.stringify({ fromAccountId: Number(fr), toAccountId: Number(to), amount: Number(amt) })
  });

  load(btn, false, '🔄 Transfer Now');

  if (r.ok) {
    toast('Transfer complete!', `${rupee(amt)} sent from #${fr} to #${to}`);
    showRes('tfR', `
      <div class="rrow"><span class="k">Status</span><span class="v v-green">✔ Success</span></div>
      <div class="rrow"><span class="k">Amount Sent</span><span class="v">${rupee(amt)}</span></div>
      <div class="rrow"><span class="k">From Account</span><span class="v v-blue">#${fr}</span></div>
      <div class="rrow"><span class="k">To Account</span><span class="v v-blue">#${to}</span></div>`);
    document.getElementById('tfAmt').value = '';
  } else {
    toast('Transfer failed', r.data?.message || 'Check account IDs and balance', 'error');
  }
}

/* ─── ALL ACCOUNTS ───────────────────────── */
async function loadAllAccs() {
  const el = document.getElementById('allAccA');
  el.innerHTML = `<div class="empty"><span class="spin" style="width:22px;height:22px;border-width:3px;"></span></div>`;

  const r = await api('/api/v1/accounts');
  if (!r.ok || !Array.isArray(r.data)) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">🔒</span>Could not load accounts. Admin privileges may be required.</div>`;
    return;
  }

  document.getElementById('accCnt').textContent = `${r.data.length} account(s)`;

  if (!r.data.length) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">👥</span>No accounts found</div>`;
    return;
  }

  const rows = r.data.map(a => `
    <tr>
      <td><strong style="color:var(--blue);">#${a.id}</strong></td>
      <td>${esc(a.accountHolderName || '—')}</td>
      <td style="color:var(--green);font-weight:600;">${rupee(a.balance)}</td>
      <td>
        <button class="btn btn-green btn-sm" onclick="qDeposit(${a.id})" title="Quick deposit">💰</button>
        &nbsp;
        <button class="icon-btn" onclick="confirmDelAcc(${a.id})" title="Delete #${a.id}">🗑</button>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <table>
      <thead>
        <tr><th>ID</th><th>Account Holder</th><th>Balance</th><th>Actions</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function qDeposit(id) {
  go('deposit');
  setTimeout(() => { document.getElementById('depId').value = id; }, 80);
}

function confirmDelAcc(id) {
  confirm2(
    'Delete Account',
    `Permanently delete account #${id}? All linked data will be removed.`,
    async () => {
      const r = await api(`/api/v1/accounts/${id}`, { method: 'DELETE' });
      if (r.ok) {
        toast('Deleted', `Account #${id} removed`);
        loadAllAccs();
      } else {
        toast('Delete failed', r.data?.message || 'Could not delete', 'error');
      }
    }
  );
}

/* ─── NEW ACCOUNT ────────────────────────── */
async function doNewAcc() {
  const name = g('naName'), bal = g('naBal');
  if (!name) { toast('Missing name', 'Enter the account holder name', 'warning'); return; }

  const btn = document.getElementById('btnNA');
  load(btn, true);

  const r = await api('/api/v1/accounts', {
    method: 'POST',
    body: JSON.stringify({ accountHolderName: name, balance: Number(bal) || 0 })
  });

  load(btn, false, '➕ Create Account');

  if (r.ok && r.data) {
    toast('Account created!', `Account #${r.data.id} is ready`);
    showRes('naR', `
      <div class="rrow"><span class="k">Account ID</span><span class="v v-blue">#${r.data.id}</span></div>
      <div class="rrow"><span class="k">Holder</span><span class="v">${esc(r.data.accountHolderName)}</span></div>
      <div class="rrow"><span class="k">Opening Balance</span><span class="v v-green">${rupee(r.data.balance)}</span></div>`);
    document.getElementById('naName').value = '';
    document.getElementById('naBal').value  = '0';
  } else {
    toast('Creation failed', r.data?.message || 'Could not create account', 'error');
  }
}
