const chat = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');
const themeBtn = document.getElementById('theme');
const closeBtn = document.getElementById('close');

function addMessage(text, role) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  input.value = '';
  addMessage('…', 'bot');
  const placeholder = chat.lastElementChild;
  try {
    const result = await window.electronAPI.generate(text);
    placeholder.textContent = result || '(empty)';
  } catch (err) {
    placeholder.textContent = String(err.message || err);
  }
});

themeBtn.addEventListener('click', async () => {
  await window.electronAPI.toggleTheme();
});

closeBtn.addEventListener('click', () => {
  window.close();
});


