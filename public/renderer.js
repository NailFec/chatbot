const chat = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');
const directiveChip = document.getElementById('directive-chip');
const themeBtn = document.getElementById('theme');
const closeBtn = document.getElementById('close');

function applyInputDirectives(raw) {
  let remaining = String(raw || '').trim();
  const directives = [];

  const consume = (regex, onMatch) => {
    const m = remaining.match(regex);
    if (!m) return false;
    remaining = remaining.slice(m[0].length).trimStart();
    onMatch();
    return true;
  };

  // Consume leading directive tokens in order, allowing multiples
  // Supported: /s, /short, /l, /long, @ew, @english-word
  while (
    consume(/^(?:\/s|\/short)\b/i, () => {
      directives.push(
        'Answer concisely. Use at most 1–3 sentences unless the user explicitly requests more. Avoid filler and preambles.'
      );
    }) ||
    consume(/^(?:\/l|\/long)\b/i, () => {
      directives.push(
        'Provide a comprehensive, well-structured answer with clear steps, rationale, trade-offs, and examples where helpful. Prefer concise bullet points and short sections.'
      );
    }) ||
    consume(/^(?:@ew|@english-word)\b/i, () => {
      directives.push(
        'Please reply in Chinese. I am Chinese and learning English (IELTS 7.0). Explain only the common meanings of the word provided in the user message, suitable for this level. For each meaning, include 1–2 example sentences in English and add a brief Chinese explanation. Keep it focused and practical.'
      );
    })
  ) {}

  const systemInstruction = directives.join('\n\n');
  return { text: remaining, systemInstruction };
}

let pendingDirective = '';
function setDirectiveChip(label) {
  pendingDirective = label || '';
  if (pendingDirective) {
    directiveChip.innerHTML = `${escapeHtml(pendingDirective)} <span class="x" title="Clear">×</span>`;
    directiveChip.classList.remove('hidden');
  } else {
    directiveChip.classList.add('hidden');
    directiveChip.textContent = '';
  }
}

directiveChip.addEventListener('click', (e) => {
  const target = e.target;
  if (target && target.classList.contains('x')) {
    setDirectiveChip('');
    input.focus();
  }
});

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// renderInline function removed - no longer needed with marked library

// Use marked library for reliable markdown rendering
function renderMarkdown(md) {
  try {
    // Configure marked options for better rendering
    const options = {
      breaks: true,
      gfm: true,    // GitHub Flavored Markdown
      headerIds: false, // Disable header IDs for security
      mangle: false,    // Disable mangling for security
    };
    
    // marked is available globally from the CDN
    return marked.parse(String(md || ''), options);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return escapeHtml(String(md || ''));
  }
}

function addMessage(text, role) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.innerHTML = renderMarkdown(text);
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function clearUI() {
  chat.innerHTML = '';
}

window.electronAPI && (function registerMainSignals(){
  window.electronAPI && window.electronAPI; // keep reference
  window.electronAPI && window.electronAPI;
  if (window.electronAPI) {
    window.electronAPI.onClearUI = () => {};
  }
})();

// Handle UI control from main process
window.addEventListener('DOMContentLoaded', () => {
  // Focus input on open/show
  input.focus();

  // Allow Shift+Enter for newline and Enter to submit
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // Auto-grow textarea height up to max-height
  const autoResize = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  };
  input.addEventListener('input', autoResize);
  setTimeout(autoResize, 0);

  // Interactive directive detection: when exact token then space, show chip and clear input
  input.addEventListener('input', () => {
    const v = input.value;
    if (/^(?:\/s|\/short|\/l|\/long|@ew|@english-word)\s$/.test(v)) {
      const token = v.trim();
      const label = (token === '/s' || token === '/short')
        ? 'short'
        : (token === '/l' || token === '/long')
          ? 'long'
          : 'english-word';
      setDirectiveChip(label);
      input.value = '';
      autoResize();
    }
  });

  const { electronAPI } = window;
  if (!electronAPI) return;

  electronAPI.onUIClear(() => {
    clearUI();
  });
  electronAPI.onUIFocus(() => {
    input.focus();
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;

  // Slash command: clear context
  if (raw.toLowerCase() === '/clear') {
    window.electronAPI.clearContext();
    chat.innerHTML = '';
    input.value = '';
    input.style.height = 'auto';
    return;
  }

  const { text: baseText, systemInstruction: inlineSystem } = applyInputDirectives(raw);
  let systemInstruction = inlineSystem;
  if (pendingDirective) {
    if (pendingDirective === 'short') {
      systemInstruction = [
        'Answer concisely. Use at most 1–3 sentences unless the user explicitly requests more. Avoid filler and preambles.',
        systemInstruction,
      ].filter(Boolean).join('\n\n');
    } else if (pendingDirective === 'long') {
      systemInstruction = [
        'Provide a comprehensive, well-structured answer with clear steps, rationale, trade-offs, and examples where helpful. Prefer concise bullet points and short sections.',
        systemInstruction,
      ].filter(Boolean).join('\n\n');
    } else if (pendingDirective === 'english-word') {
      systemInstruction = [
        'Please reply in Chinese. I am Chinese and learning English (IELTS 7.0). Explain only the common meanings of the word provided in the user message, suitable for this level. For each meaning, include 1–2 example sentences in English and add a brief Chinese explanation. Keep it focused and practical.',
        systemInstruction,
      ].filter(Boolean).join('\n\n');
    }
  }
  const text = baseText;
  addMessage(text, 'user');
  input.value = '';
  input.style.height = 'auto';
  if (pendingDirective) setDirectiveChip('');
  addMessage('', 'bot');
  const placeholder = chat.lastElementChild;
  // Initialize raw buffer for streaming markdown
  placeholder.dataset.src = '';

  const unsubscribe = window.electronAPI.onChunk((delta) => {
    const prev = placeholder.dataset.src || '';
    const next = prev + String(delta);
    placeholder.dataset.src = next;
    placeholder.innerHTML = renderMarkdown(next);
    chat.scrollTop = chat.scrollHeight;
  });
  window.electronAPI.onceDone(() => {
    unsubscribe();
  });
  window.electronAPI.onceError((err) => {
    unsubscribe();
    placeholder.textContent = String(err || 'Error');
  });
  window.electronAPI.stream({ text, systemInstruction });
});

themeBtn.addEventListener('click', async () => {
  await window.electronAPI.toggleTheme();
});

closeBtn.addEventListener('click', async () => {
  await window.electronAPI.hideWindow();
});


