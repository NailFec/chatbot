const chat = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');
const themeBtn = document.getElementById('theme');
const closeBtn = document.getElementById('close');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text) {
  // Handle inline code first using backtick toggling
  const segments = text.split('`');
  let out = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i % 2 === 1) {
      out += `<code>${escapeHtml(seg)}</code>`;
    } else {
      let s = escapeHtml(seg);
      // Bold then italic
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*(?!\*)([^*]+)\*/g, '<em>$1</em>');
      out += s;
    }
  }
  return out;
}

function renderMarkdown(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inCode = false;
  let codeBuffer = [];
  let inList = false;
  let listType = 'ul';
  let inParagraph = false;
  let paraBuffer = [];

  function closeParagraph() {
    if (inParagraph) {
      html += `<p>${paraBuffer.join('<br/>')}</p>`;
      inParagraph = false;
      paraBuffer = [];
    }
  }

  function closeList() {
    if (inList) {
      html += listType === 'ol' ? '</ol>' : '</ul>';
      inList = false;
    }
  }

  function openList(type) {
    if (!inList || listType !== type) {
      closeParagraph();
      closeList();
      listType = type;
      html += type === 'ol' ? '<ol>' : '<ul>';
      inList = true;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '    ');

    if (inCode) {
      if (/^```/.test(line)) {
        html += `<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
        inCode = false;
        codeBuffer = [];
        continue;
      }
      codeBuffer.push(line);
      continue;
    }

    if (/^```/.test(line)) {
      closeParagraph();
      closeList();
      inCode = true;
      codeBuffer = [];
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      openList('ul');
      html += `<li>${renderInline(ul[1])}</li>`;
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      openList('ol');
      html += `<li>${renderInline(ol[1])}</li>`;
      continue;
    }

    // Paragraph text line
    if (!inParagraph) {
      inParagraph = true;
      paraBuffer = [];
    }
    paraBuffer.push(renderInline(line));
  }

  if (inCode) {
    html += `<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
  }
  closeParagraph();
  closeList();
  return html;
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
    return;
  }

  const text = raw;
  addMessage(text, 'user');
  input.value = '';
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
  window.electronAPI.stream(text);
});

themeBtn.addEventListener('click', async () => {
  await window.electronAPI.toggleTheme();
});

closeBtn.addEventListener('click', async () => {
  await window.electronAPI.hideWindow();
});


