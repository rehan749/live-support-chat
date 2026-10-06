(function () {
  if (window.SupportlyLoaded) return;
  window.SupportlyLoaded = true;

  // 1. Find script & site configuration
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var siteId = currentScript ? currentScript.getAttribute('data-site') : null;
  var scriptSrc = currentScript ? currentScript.src : window.location.origin;
  var serverOrigin = new URL(scriptSrc).origin;

  if (!siteId) {
    console.error('[Supportly] Missing data-site attribute on widget script tag.');
    return;
  }

  var storageKey = 'supportly_conv_' + siteId;
  var storedData = null;
  try {
    var raw = localStorage.getItem(storageKey);
    if (raw) storedData = JSON.parse(raw);
  } catch (e) {}

  var siteConfig = {
    name: 'Customer Support',
    color: '#6366f1',
    greeting: 'Hi there! How can we help you today?',
    position: 'right',
    online: true,
  };

  var isOpen = false;
  var messages = [];
  var pollTimer = null;

  // 2. Inject CSS
  var style = document.createElement('style');
  style.textContent = `
    .supportly-bubble {
      position: fixed;
      bottom: 24px;
      z-index: 2147483640;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
      color: white;
      border: none;
      outline: none;
    }
    .supportly-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(0,0,0,0.24);
    }
    .supportly-bubble.pos-right { right: 24px; }
    .supportly-bubble.pos-left { left: 24px; }
    .supportly-bubble svg { width: 28px; height: 28px; stroke-width: 2.2; }

    .supportly-window {
      position: fixed;
      bottom: 96px;
      z-index: 2147483645;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 580px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.18);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .supportly-window.open { display: flex; }
    .supportly-window.pos-right { right: 24px; }
    .supportly-window.pos-left { left: 24px; }

    .supportly-header {
      padding: 18px 20px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .supportly-header-title { font-size: 15px; font-weight: 700; margin: 0; line-height: 1.2; }
    .supportly-header-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }
    .supportly-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
      opacity: 0.8;
      padding: 4px;
      line-height: 1;
    }
    .supportly-close:hover { opacity: 1; }

    .supportly-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .supportly-greeting-card {
      background: white;
      border-radius: 14px;
      padding: 14px;
      border: 1px solid #e2e8f0;
      font-size: 13px;
      color: #334155;
      line-height: 1.45;
    }

    .supportly-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }
    .supportly-form input, .supportly-form textarea {
      width: 100%;
      padding: 10px 12px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      box-sizing: border-box;
      outline: none;
      font-family: inherit;
    }
    .supportly-form textarea { resize: none; }
    .supportly-form input:focus, .supportly-form textarea:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
    .supportly-submit {
      padding: 11px;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .supportly-submit:hover { opacity: 0.9; }

    .supportly-msg {
      max-width: 82%;
      padding: 10px 14px;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 14px;
      word-break: break-word;
    }
    .supportly-msg.visitor {
      align-self: flex-end;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .supportly-msg.agent {
      align-self: flex-start;
      background: white;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
    }
    .supportly-msg.bot {
      align-self: flex-start;
      background: #f5f3ff;
      color: #3b0764;
      border: 1px solid #ddd6fe;
      border-bottom-left-radius: 4px;
    }

    .supportly-footer {
      padding: 12px;
      background: white;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
    }
    .supportly-footer input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
    }
    .supportly-footer input:focus { border-color: #6366f1; }
    .supportly-footer button {
      padding: 9px 14px;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  // 3. Create DOM Elements
  var bubble = document.createElement('button');
  bubble.className = 'supportly-bubble pos-right';
  bubble.setAttribute('aria-label', 'Open Live Chat');
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;

  var win = document.createElement('div');
  win.className = 'supportly-window pos-right';
  win.innerHTML = `
    <div class="supportly-header">
      <div>
        <h4 class="supportly-header-title">Live Chat</h4>
        <div class="supportly-header-sub">We reply immediately</div>
      </div>
      <button class="supportly-close" aria-label="Close Chat">&times;</button>
    </div>
    <div class="supportly-body" id="supportly-body"></div>
    <div class="supportly-footer" id="supportly-footer" style="display:none;">
      <input type="text" placeholder="Type your message..." id="supportly-input" />
      <button id="supportly-send">Send</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var header = win.querySelector('.supportly-header');
  var headerTitle = win.querySelector('.supportly-header-title');
  var headerSub = win.querySelector('.supportly-header-sub');
  var body = document.getElementById('supportly-body');
  var footer = document.getElementById('supportly-footer');
  var input = document.getElementById('supportly-input');
  var sendBtn = document.getElementById('supportly-send');
  var closeBtn = win.querySelector('.supportly-close');

  // 4. Fetch Site Config
  fetch(serverOrigin + '/api/widget?site=' + encodeURIComponent(siteId))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.site) {
        siteConfig = Object.assign(siteConfig, data.site);
        applyStyles();
      }
    })
    .catch(function () {});

  function applyStyles() {
    bubble.style.backgroundColor = siteConfig.color;
    header.style.backgroundColor = siteConfig.color;
    sendBtn.style.backgroundColor = siteConfig.color;
    headerTitle.textContent = siteConfig.name;
    headerSub.textContent = siteConfig.online ? 'Online • Ready to help' : 'Away • Leave a message';

    if (siteConfig.position === 'left') {
      bubble.classList.remove('pos-right');
      bubble.classList.add('pos-left');
      win.classList.remove('pos-right');
      win.classList.add('pos-left');
    }
  }

  // 5. Render View (Intake form or Chat messages)
  function render() {
    if (!storedData) {
      footer.style.display = 'none';
      body.innerHTML = `
        <div class="supportly-greeting-card">
          <strong>👋 Welcome!</strong><br />
          ${siteConfig.greeting}
        </div>
        <form class="supportly-form" id="supportly-intake-form">
          <input type="text" id="sup-name" placeholder="Your name" required />
          <input type="email" id="sup-email" placeholder="Email address" required />
          <textarea id="sup-msg" rows="3" placeholder="How can we help?" required></textarea>
          <button type="submit" class="supportly-submit" style="background-color: ${siteConfig.color};">Start conversation</button>
        </form>
      `;

      var form = document.getElementById('supportly-intake-form');
      form.onsubmit = function (e) {
        e.preventDefault();
        var vName = document.getElementById('sup-name').value;
        var vEmail = document.getElementById('sup-email').value;
        var vMsg = document.getElementById('sup-msg').value;

        fetch(serverOrigin + '/api/widget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            site_id: siteId,
            visitor_name: vName,
            email: vEmail,
            page: window.location.href,
            message: vMsg,
          }),
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.conversation_id && data.token) {
              storedData = {
                conversation_id: data.conversation_id,
                token: data.token,
                visitor_name: vName,
              };
              try { localStorage.setItem(storageKey, JSON.stringify(storedData)); } catch (e) {}
              render();
              fetchMessages();
            }
          });
      };
    } else {
      footer.style.display = 'flex';
      body.innerHTML = '';
      messages.forEach(function (m) {
        var d = document.createElement('div');
        d.className = 'supportly-msg ' + m.sender;
        if (m.sender === 'visitor') {
          d.style.backgroundColor = siteConfig.color;
        }
        d.textContent = m.body;
        body.appendChild(d);
      });
      body.scrollTop = body.scrollHeight;
    }
  }

  // 6. Fetch / Poll Messages
  function fetchMessages() {
    if (!storedData) return;
    fetch(serverOrigin + '/api/widget?site=' + encodeURIComponent(siteId) +
      '&conversation=' + encodeURIComponent(storedData.conversation_id) +
      '&token=' + encodeURIComponent(storedData.token))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.messages && data.messages.length !== messages.length) {
          messages = data.messages;
          render();
        }
      })
      .catch(function () {});
  }

  // 7. Send New Message
  function sendMessage() {
    if (!storedData || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = '';

    messages.push({ sender: 'visitor', body: text });
    render();

    fetch(serverOrigin + '/api/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message',
        site_id: siteId,
        conversation_id: storedData.conversation_id,
        token: storedData.token,
        message: text,
      }),
    })
      .then(function () {
        setTimeout(fetchMessages, 1200);
      })
      .catch(function () {});
  }

  sendBtn.onclick = sendMessage;
  input.onkeydown = function (e) {
    if (e.key === 'Enter') sendMessage();
  };

  // 8. Toggling
  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      render();
      fetchMessages();
      pollTimer = setInterval(fetchMessages, 3000);
    } else {
      win.classList.remove('open');
      clearInterval(pollTimer);
    }
  }

  bubble.onclick = toggle;
  closeBtn.onclick = toggle;

  // Window API
  window.Supportly = {
    open: function () { if (!isOpen) toggle(); },
    close: function () { if (isOpen) toggle(); },
    toggle: toggle,
  };
})();
