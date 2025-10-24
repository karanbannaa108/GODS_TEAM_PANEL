// Frontend talks to backend for real verification
const paidBtn = document.getElementById('paidBtn');
const waiting = document.getElementById('waiting');
const login = document.getElementById('login');
const payment = document.getElementById('payment');
const accessBtn = document.getElementById('accessBtn');
const panel = document.getElementById('panel');
const logoutBtn = document.getElementById('logoutBtn');

let sessionId = null;
paidBtn.addEventListener('click', async () => {
  paidBtn.disabled = true;
  paidBtn.textContent = 'Creating session...';
  try {
    const r = await fetch('/api/create-session', { method: 'POST' });
    const j = await r.json();
    sessionId = j.sessionId;
    waiting.classList.remove('hidden');
    paidBtn.textContent = 'Waiting for verification...';
    // poll for status
    const poll = setInterval(async () => {
      const s = await fetch('/api/check-status?sessionId=' + encodeURIComponent(sessionId));
      const js = await s.json();
      if (js.paid) {
        clearInterval(poll);
        waiting.classList.add('hidden');
        payment.classList.add('hidden');
        login.classList.remove('hidden');
      }
    }, 3000);
  } catch (err) {
    alert('Could not create session');
    paidBtn.disabled = false;
    paidBtn.textContent = 'I PAID';
  }
});

accessBtn.addEventListener('click', () => {
  // hidden credentials are applied server-side; frontend just shows panel
  login.classList.add('hidden');
  panel.classList.remove('hidden');
});

logoutBtn.addEventListener('click', () => {
  panel.classList.add('hidden');
  payment.classList.remove('hidden');
  paidBtn.disabled = false;
  paidBtn.textContent = 'I PAID';
});