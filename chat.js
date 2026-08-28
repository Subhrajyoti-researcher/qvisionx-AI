/* QVisionX site assistant — self-contained widget.
   Injects its own styles and markup so any page includes it with one tag.
   Talks only to /api/chat on this origin; no key ever reaches the browser. */
(function () {
  'use strict';

  if (window.__qvxChat) return;          // never double-mount
  window.__qvxChat = true;

  var GREETING = "Hi — I'm the QVisionX assistant. Ask me about our vision, agentic or physical AI work, and I'll point you to the right place.";
  var SUGGESTIONS = ['What do you actually build?', 'How does an engagement work?', 'Tell me about the Physical AI work'];

  var css = `
.qvx-fab{position:fixed;right:20px;bottom:20px;z-index:9998;width:56px;height:56px;border-radius:50%;
 border:none;cursor:pointer;background:linear-gradient(135deg,#6393ff,#8b5cf6);
 box-shadow:0 6px 24px rgba(99,147,255,.38);display:flex;align-items:center;justify-content:center;
 transition:transform .2s,box-shadow .2s}
.qvx-fab:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(99,147,255,.5)}
.qvx-fab svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.qvx-fab.open .qvx-ico-chat{display:none}
.qvx-fab:not(.open) .qvx-ico-close{display:none}

.qvx-panel{position:fixed;right:20px;bottom:88px;z-index:9999;width:380px;max-width:calc(100vw - 40px);
 height:540px;max-height:calc(100vh - 120px);background:#0c1018;border:1px solid rgba(255,255,255,.09);
 border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden;
 font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.qvx-panel.open{display:flex}

.qvx-head{display:flex;align-items:center;gap:11px;padding:15px 17px;border-bottom:1px solid rgba(255,255,255,.07);
 background:#111722;flex-shrink:0}
.qvx-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;flex-shrink:0}
.qvx-head-t{flex:1;min-width:0}
.qvx-head-t b{display:block;font-family:'Space Grotesk',Inter,sans-serif;font-size:14px;font-weight:600;color:#f0f2f5}
.qvx-head-t span{display:block;font-size:11.5px;color:#78849a;margin-top:1px}
.qvx-x{background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;display:flex;color:#78849a}
.qvx-x:hover{background:rgba(255,255,255,.06);color:#f0f2f5}
.qvx-x svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}

.qvx-body{flex:1;overflow-y:auto;padding:17px;display:flex;flex-direction:column;gap:13px}
.qvx-body::-webkit-scrollbar{width:7px}
.qvx-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}

.qvx-msg{max-width:86%;font-size:14px;line-height:1.62;white-space:pre-wrap;word-wrap:break-word}
.qvx-msg.bot{align-self:flex-start;color:#c9d1de;background:#111722;border:1px solid rgba(255,255,255,.06);
 padding:11px 14px;border-radius:13px 13px 13px 4px}
.qvx-msg.me{align-self:flex-end;color:#fff;background:linear-gradient(135deg,#6393ff,#8b5cf6);
 padding:11px 14px;border-radius:13px 13px 4px 13px}
.qvx-msg.err{align-self:flex-start;color:#fca5a5;background:rgba(248,113,113,.09);
 border:1px solid rgba(248,113,113,.25);padding:11px 14px;border-radius:13px}
.qvx-msg a{color:#85b0ff}

.qvx-sugg{display:flex;flex-wrap:wrap;gap:7px;margin-top:2px}
.qvx-sugg button{font-family:inherit;font-size:12.5px;color:#85b0ff;background:rgba(99,147,255,.1);
 border:1px solid rgba(99,147,255,.26);padding:7px 12px;border-radius:100px;cursor:pointer;transition:background .18s}
.qvx-sugg button:hover{background:rgba(99,147,255,.2)}

.qvx-typing{align-self:flex-start;display:flex;gap:4px;padding:13px 15px;background:#111722;
 border:1px solid rgba(255,255,255,.06);border-radius:13px 13px 13px 4px}
.qvx-typing i{width:6px;height:6px;border-radius:50%;background:#78849a;animation:qvxb 1.3s ease-in-out infinite}
.qvx-typing i:nth-child(2){animation-delay:.18s}
.qvx-typing i:nth-child(3){animation-delay:.36s}
@keyframes qvxb{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}

.qvx-foot{padding:13px;border-top:1px solid rgba(255,255,255,.07);background:#111722;flex-shrink:0}
.qvx-inrow{display:flex;gap:8px;align-items:flex-end}
.qvx-in{flex:1;resize:none;font-family:inherit;font-size:15px;line-height:1.45;color:#f0f2f5;
 background:#06080d;border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:10px 12px;
 max-height:104px;outline:none}
.qvx-in:focus{border-color:#6393ff;box-shadow:0 0 0 3px rgba(99,147,255,.15)}
.qvx-in::placeholder{color:#78849a}
.qvx-send{width:40px;height:40px;flex-shrink:0;border:none;border-radius:10px;cursor:pointer;
 background:linear-gradient(135deg,#6393ff,#8b5cf6);display:flex;align-items:center;justify-content:center}
.qvx-send:disabled{opacity:.4;cursor:not-allowed}
.qvx-send svg{width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.qvx-note{font-size:11px;color:#78849a;text-align:center;margin-top:8px;line-height:1.45}
.qvx-note a{color:#78849a}

@media (max-width:520px){
 .qvx-panel{right:10px;left:10px;width:auto;bottom:80px;height:calc(100vh - 108px)}
 .qvx-fab{right:16px;bottom:16px}
}
@media (prefers-reduced-motion:reduce){.qvx-typing i{animation:none}}
`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<button class="qvx-fab" id="qvx-fab" aria-label="Open chat assistant" aria-expanded="false">' +
      '<svg class="qvx-ico-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<svg class="qvx-ico-close" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
    '</button>' +
    '<div class="qvx-panel" id="qvx-panel" role="dialog" aria-label="QVisionX assistant">' +
      '<div class="qvx-head">' +
        '<span class="qvx-dot"></span>' +
        '<div class="qvx-head-t"><b>QVisionX assistant</b><span>Answers about our work</span></div>' +
        '<button class="qvx-x" id="qvx-x" aria-label="Close chat">' +
          '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
      '</div>' +
      '<div class="qvx-body" id="qvx-body" aria-live="polite"></div>' +
      '<div class="qvx-foot">' +
        '<div class="qvx-inrow">' +
          '<textarea class="qvx-in" id="qvx-in" rows="1" placeholder="Ask about our work…" aria-label="Message"></textarea>' +
          '<button class="qvx-send" id="qvx-send" aria-label="Send">' +
            '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>' +
        '</div>' +
        '<div class="qvx-note">AI assistant — it can be wrong. For anything binding, ' +
          '<a href="mailto:hello@qvisionx.com">email us</a>.</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);

  var fab   = document.getElementById('qvx-fab');
  var panel = document.getElementById('qvx-panel');
  var body  = document.getElementById('qvx-body');
  var input = document.getElementById('qvx-in');
  var send  = document.getElementById('qvx-send');

  var history = [];        // {role, content} — mirrors what the API sees
  var busy = false;
  var started = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Escape first, then linkify — never inject model output as raw HTML.
  function render(text) {
    var safe = esc(text);
    safe = safe.replace(/\b(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    safe = safe.replace(/\b([\w.+-]+@[\w-]+\.[\w.]+)\b/g, '<a href="mailto:$1">$1</a>');
    safe = safe.replace(/(^|[\s(])\/(demo|physical-ai|privacy|terms)\b/g, '$1<a href="/$2">/$2</a>');
    return safe;
  }

  function bubble(cls, text) {
    var el = document.createElement('div');
    el.className = 'qvx-msg ' + cls;
    el.innerHTML = render(text);
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function typing() {
    var el = document.createElement('div');
    el.className = 'qvx-typing';
    el.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function suggestions() {
    var box = document.createElement('div');
    box.className = 'qvx-sugg';
    SUGGESTIONS.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', function () { box.remove(); ask(q); });
      box.appendChild(b);
    });
    body.appendChild(box);
    body.scrollTop = body.scrollHeight;
  }

  function open() {
    panel.classList.add('open');
    fab.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      bubble('bot', GREETING);
      suggestions();
    }
    setTimeout(function () { input.focus(); }, 60);
  }
  function close() {
    panel.classList.remove('open');
    fab.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', function () {
    panel.classList.contains('open') ? close() : open();
  });
  document.getElementById('qvx-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) close();
  });

  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 104) + 'px';
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  send.addEventListener('click', submit);

  function submit() {
    var v = input.value.trim();
    if (!v || busy) return;
    input.value = '';
    input.style.height = 'auto';
    ask(v);
  }

  function ask(text) {
    if (busy) return;
    busy = true;
    send.disabled = true;

    bubble('me', text);
    history.push({ role: 'user', content: text });

    var dots = typing();
    var out = null;
    var acc = '';

    // 45s ceiling so a hung stream can't lock the widget forever.
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 45000);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) }),
      signal: ctrl.signal
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            throw new Error(j.message || 'Request failed');
          });
        }
        if (!res.body) throw new Error('Streaming unsupported');

        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = '';

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += dec.decode(r.value, { stream: true });

            // SSE frames are separated by a blank line.
            var frames = buf.split('\n\n');
            buf = frames.pop();

            frames.forEach(function (frame) {
              var ev = 'message', data = '';
              frame.split('\n').forEach(function (line) {
                if (line.indexOf('event:') === 0) ev = line.slice(6).trim();
                else if (line.indexOf('data:') === 0) data += line.slice(5).trim();
              });
              if (!data) return;

              var payload;
              try { payload = JSON.parse(data); } catch (e) { return; }

              if (ev === 'delta' && payload.text) {
                if (dots) { dots.remove(); dots = null; }
                if (!out) out = bubble('bot', '');
                acc += payload.text;
                out.innerHTML = render(acc);
                body.scrollTop = body.scrollHeight;
              } else if (ev === 'error') {
                if (dots) { dots.remove(); dots = null; }
                throw new Error(payload.message || 'Something went wrong');
              }
            });
            return pump();
          });
        }
        return pump();
      })
      .then(function () {
        if (acc) history.push({ role: 'assistant', content: acc });
        else if (!out) bubble('err', 'No response came back. Please try again, or email hello@qvisionx.com.');
      })
      .catch(function (err) {
        if (dots) { dots.remove(); dots = null; }
        var msg = err && err.name === 'AbortError'
          ? 'That took too long. Please try again, or email hello@qvisionx.com.'
          : (err && err.message) || 'Something went wrong.';
        if (out && acc) { /* keep the partial answer, append the notice */ }
        bubble('err', msg);
        // Drop the unanswered turn so the next request isn't sent with a dangling user message.
        if (!acc && history.length && history[history.length - 1].role === 'user') history.pop();
      })
      .finally(function () {
        clearTimeout(timer);
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }
})();
