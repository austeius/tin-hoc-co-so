// app.js - Logic cho website ôn thi Tin học cơ sở C - UTC

(function() {
  'use strict';

  // ─── STATE TOÀN CỤC ──────────────────────────────────────────────────────────
  let questions = [];
  let currentQIndex = 0;
  let activeFilter = 'all'; // 'all', 'review', 'done', 'todo'
  let searchQuery = '';
  let selectedModel = localStorage.getItem('utc_selected_model') || 'gemini-2.0-flash';
  let availableProviders = [];

  // DOM Elements
  const elSearchInput = document.getElementById('search-input');
  const elFilterBtns = document.querySelectorAll('.filter-btn');
  const elQuestionList = document.getElementById('question-list');

  // Stats
  const elStatTotal = document.getElementById('stat-total');
  const elStatDone = document.getElementById('stat-done');
  const elStatReview = document.getElementById('stat-review');
  const elStatBar = document.getElementById('stat-bar');

  // Current Question
  const elCurrGroup = document.getElementById('curr-group');
  const elCurrTitle = document.getElementById('curr-title');
  const elCurrIdBadge = document.getElementById('curr-id-badge');
  const elCurrStatement = document.getElementById('curr-statement');
  const elCurrNotes = document.getElementById('curr-notes');
  const elBtnPrev = document.getElementById('btn-prev-q');
  const elBtnNext = document.getElementById('btn-next-q');
  const elBtnMarkReview = document.getElementById('btn-mark-review');
  const elBtnMarkDone = document.getElementById('btn-mark-done');

  // Draft Editor
  const elCodeEditor = document.getElementById('code-editor');
  const elSaveStatus = document.getElementById('save-status');
  const elBtnDownloadDraft = document.getElementById('btn-download-draft');
  const elBtnResetDraft = document.getElementById('btn-reset-draft');

  // Solution
  const elBtnToggleSolution = document.getElementById('btn-toggle-solution');
  const elSolutionSection = document.getElementById('solution-section');
  const elCurrApproach = document.getElementById('curr-approach');
  const elCurrCode = document.getElementById('curr-code');
  const elCurrSolFile = document.getElementById('curr-sol-file');
  const elBtnCopyCode = document.getElementById('btn-copy-code');
  const elBtnDownloadSolution = document.getElementById('btn-download-solution');
  const elCurrExamples = document.getElementById('curr-examples');

  // AI Panel
  const elModelSelect = document.getElementById('model-select');
  const elBtnAiHint = document.getElementById('btn-ai-hint');
  const elBtnAiFindBugs = document.getElementById('btn-ai-find-bugs');
  const elBtnAiExplain = document.getElementById('btn-ai-explain');
  const elAiChatBody = document.getElementById('ai-chat-body');
  const elAiUserInput = document.getElementById('ai-user-input');
  const elBtnSendAi = document.getElementById('btn-send-ai');
  const elBtnClearChat = document.getElementById('btn-clear-chat');
  const elAiStatusBanner = document.getElementById('ai-status-banner');

  // ─── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────
  function getQStatus(id) {
    return localStorage.getItem('utc_status_' + id) || ''; // 'done', 'review', or ''
  }

  function setQStatus(id, status) {
    if (status) {
      localStorage.setItem('utc_status_' + id, status);
    } else {
      localStorage.removeItem('utc_status_' + id);
    }
    updateStats();
    renderQuestionList();
    updateStatusButtons();
  }

  function getQDraft(id) {
    return localStorage.getItem('utc_draft_' + id) || '';
  }

  function setQDraft(id, text) {
    localStorage.setItem('utc_draft_' + id, text);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN');
    elSaveStatus.textContent = 'Đã lưu lúc ' + timeStr;
    elSaveStatus.style.color = 'var(--success)';
  }

  function getQChat(id) {
    try {
      const raw = localStorage.getItem('utc_chat_' + id);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setQChat(id, messages) {
    localStorage.setItem('utc_chat_' + id, JSON.stringify(messages));
  }

  // ─── KHỞI TẠO DỮ LIỆU ──────────────────────────────────────────────────────
  async function init() {
    if (typeof QUESTIONS_DATA !== 'undefined' && Array.isArray(QUESTIONS_DATA) && QUESTIONS_DATA.length > 0) {
      questions = QUESTIONS_DATA;
    } else {
      try {
        const resp = await fetch('data.json');
        questions = await resp.json();
      } catch (err) {
        console.error('Không tải được data.json:', err);
        alert('Lỗi: Không tải được dữ liệu câu hỏi!');
        return;
      }
    }

    // Load last viewed question
    const lastId = localStorage.getItem('utc_last_q_id');
    if (lastId) {
      const idx = questions.findIndex(q => q.id === lastId);
      if (idx !== -1) currentQIndex = idx;
    }

    updateStats();
    renderQuestionList();
    renderCurrentQuestion();
    loadModels();
    bindEvents();
  }

  // ─── THỐNG KÊ TIẾN ĐỘ ─────────────────────────────────────────────────────
  function updateStats() {
    let done = 0;
    let review = 0;
    questions.forEach(q => {
      const st = getQStatus(q.id);
      if (st === 'done') done++;
      else if (st === 'review') review++;
    });

    elStatTotal.textContent = questions.length;
    elStatDone.textContent = done;
    elStatReview.textContent = review;

    const pct = questions.length > 0 ? Math.round((done / questions.length) * 100) : 0;
    elStatBar.style.width = pct + '%';
  }

  // ─── RENDER DANH SÁCH CÂU HỎI THEO ĐỀ ──────────────────────────────────────
  function renderQuestionList() {
    const qTerm = searchQuery.toLowerCase().trim();

    // Group questions by 'group'
    const grouped = {};
    questions.forEach((q, idx) => {
      // Check filter
      const st = getQStatus(q.id);
      let matchFilter = true;
      if (activeFilter === 'done') matchFilter = (st === 'done');
      else if (activeFilter === 'review') matchFilter = (st === 'review');
      else if (activeFilter === 'todo') matchFilter = (!st || st === '');

      // Check search: match id, group, title, or statement
      let matchSearch = true;
      if (qTerm) {
        const inId = q.id.toLowerCase().includes(qTerm);
        const inGroup = q.group.toLowerCase().includes(qTerm);
        const inTitle = q.title.toLowerCase().includes(qTerm);
        const inStatement = q.statement.toLowerCase().includes(qTerm);
        matchSearch = inId || inGroup || inTitle || inStatement;
      }

      if (matchFilter && matchSearch) {
        if (!grouped[q.group]) grouped[q.group] = [];
        grouped[q.group].push({ q, idx });
      }
    });

    elQuestionList.innerHTML = '';
    const groupKeys = Object.keys(grouped);

    if (groupKeys.length === 0) {
      elQuestionList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Không tìm thấy câu hỏi phù hợp.</div>';
      return;
    }

    groupKeys.forEach(grpName => {
      const items = grouped[grpName];
      const grpEl = document.createElement('div');
      grpEl.className = 'group-container';

      // Group Header
      const headerEl = document.createElement('div');
      headerEl.className = 'group-header';
      headerEl.innerHTML = `
        <span>${escapeHTML(grpName)}</span>
        <span class="group-count">${items.length} câu</span>
      `;

      const listContainer = document.createElement('div');
      listContainer.className = 'group-items-list';

      // Expand group if active question is inside or if searching
      const hasActive = items.some(item => item.idx === currentQIndex);
      if (!hasActive && !qTerm && groupKeys.length > 5) {
        listContainer.style.display = 'none';
      }

      headerEl.addEventListener('click', () => {
        listContainer.style.display = listContainer.style.display === 'none' ? 'block' : 'none';
      });

      items.forEach(({ q, idx }) => {
        const st = getQStatus(q.id);
        const hasDraft = !!getQDraft(q.id);

        const itemEl = document.createElement('div');
        itemEl.className = 'question-item' + (idx === currentQIndex ? ' active' : '');
        itemEl.id = 'q-item-' + idx;

        let statusBadge = '';
        if (st === 'done') {
          statusBadge = '<span title="Đã nắm">✅</span>';
        } else if (st === 'review') {
          statusBadge = '<span title="Cần ôn lại">⚠️</span>';
        } else if (hasDraft) {
          statusBadge = '<span title="Có bài nháp" style="opacity: 0.6;">📝</span>';
        }

        itemEl.innerHTML = `
          <div class="q-info">
            <div class="q-title">${escapeHTML(q.title)}</div>
            <div class="q-meta">${escapeHTML(q.id)}</div>
          </div>
          <div class="q-status-badge">${statusBadge}</div>
        `;

        itemEl.addEventListener('click', () => {
          switchQuestion(idx);
        });

        listContainer.appendChild(itemEl);
      });

      grpEl.appendChild(headerEl);
      grpEl.appendChild(listContainer);
      elQuestionList.appendChild(grpEl);
    });

    // Auto scroll active item into view
    const activeEl = document.getElementById('q-item-' + currentQIndex);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ─── CHUYỂN CÂU HỎI ───────────────────────────────────────────────────────
  function switchQuestion(newIndex) {
    if (newIndex < 0 || newIndex >= questions.length) return;
    currentQIndex = newIndex;
    const q = questions[currentQIndex];
    localStorage.setItem('utc_last_q_id', q.id);

    renderQuestionList();
    renderCurrentQuestion();
    renderChatForCurrentQuestion();
  }

  // ─── HIỂN THỊ CÂU HỎI HIỆN TẠI ──────────────────────────────────────────
  function renderCurrentQuestion() {
    const q = questions[currentQIndex];
    if (!q) return;

    // Header info
    elCurrGroup.textContent = q.group;
    elCurrTitle.textContent = q.title;
    elCurrIdBadge.textContent = 'Mã: ' + q.id;

    // Statement
    elCurrStatement.textContent = q.statement;

    // Notes
    if (q.notes && q.notes.length > 0) {
      elCurrNotes.style.display = 'block';
      elCurrNotes.innerHTML = '<strong>⚠️ Chú ý:</strong> ' + q.notes.map(escapeHTML).join('<br>');
    } else {
      elCurrNotes.style.display = 'none';
      elCurrNotes.innerHTML = '';
    }

    // Status Buttons
    updateStatusButtons();

    // Prev / Next button state
    elBtnPrev.disabled = (currentQIndex === 0);
    elBtnNext.disabled = (currentQIndex === questions.length - 1);

    // Code Draft
    const savedDraft = getQDraft(q.id);
    elCodeEditor.value = savedDraft;
    elSaveStatus.textContent = savedDraft ? 'Đã lưu bản nháp' : 'Chưa có bản nháp';
    elSaveStatus.style.color = savedDraft ? 'var(--success)' : 'var(--text-muted)';

    // Solution Section (Reset hidden by default)
    hideSolution();
    elCurrApproach.textContent = q.approach || 'Chưa có mô tả ý tưởng.';
    elCurrSolFile.textContent = q.solution_file || '';
    
    // Highlight Code
    elCurrCode.innerHTML = highlightC(q.code || '');

    // Examples
    elCurrExamples.innerHTML = '';
    if (q.examples && q.examples.length > 0) {
      q.examples.forEach((ex, idx) => {
        const exBox = document.createElement('div');
        exBox.className = 'example-box';
        exBox.innerHTML = `
          <h4>Ví dụ ${idx + 1}</h4>
          <div style="margin-bottom: 0.4rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Đầu vào (stdin):</div>
            <pre class="example-pre">${escapeHTML(ex.stdin || '')}</pre>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Kết quả (stdout):</div>
            <pre class="example-pre">${escapeHTML(ex.stdout || '')}</pre>
          </div>
        `;
        elCurrExamples.appendChild(exBox);
      });
    } else {
      elCurrExamples.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Không có ví dụ mẫu cho câu này.</div>';
    }
  }

  function updateStatusButtons() {
    const q = questions[currentQIndex];
    if (!q) return;
    const st = getQStatus(q.id);

    if (st === 'review') {
      elBtnMarkReview.classList.add('active');
      elBtnMarkDone.classList.remove('active');
    } else if (st === 'done') {
      elBtnMarkReview.classList.remove('active');
      elBtnMarkDone.classList.add('active');
    } else {
      elBtnMarkReview.classList.remove('active');
      elBtnMarkDone.classList.remove('active');
    }
  }

  function hideSolution() {
    elSolutionSection.classList.remove('show');
    elBtnToggleSolution.innerHTML = '<span>👁️ Xem Lời Giải & Code Mẫu</span>';
  }

  function toggleSolution() {
    const isOpen = elSolutionSection.classList.toggle('show');
    if (isOpen) {
      elBtnToggleSolution.innerHTML = '<span>🙈 Ẩn Lời Giải</span>';
    } else {
      elBtnToggleSolution.innerHTML = '<span>👁️ Xem Lời Giải & Code Mẫu</span>';
    }
  }

  // ─── TÔ MÀU CÚ PHÁP C (SYNTAX HIGHLIGHTER) ──────────────────────────────────
  function highlightC(source) {
    if (!source) return '';

    // Tokens
    const keywords = /\b(return|if|else|for|while|do|switch|case|default|break|continue|goto|sizeof|typedef|struct|enum|union|const|static|extern|inline|volatile)\b/g;
    const types = /\b(int|float|double|char|void|long|short|unsigned|signed|size_t|bool)\b/g;
    const preprocessors = /(#include\s+<[^>]+>|#include\s+"[^"]+"|#define\s+\w+|#ifdef|#ifndef|#endif|#pragma)/g;
    const functions = /\b([a-zA-Z_]\w*)(?=\s*\()/g;
    const numbers = /\b(0x[0-9a-fA-F]+|\d+(\.\d+)?([eE][+-]?\d+)?[fFlL]?)\b/g;
    const strings = /("[^"\\]*(\\.[^"\\]*)*"|'[^'\\]*(\\.[^'\\]*)*')/g;
    const lineComments = /(\/\/[^\n]*)/g;
    const blockComments = /(\/\*[\s\S]*?\*\/)/g;

    // Use placeholder replacement to avoid nested matches
    const tokens = [];
    function saveToken(match, cls) {
      const id = '___TOK_' + tokens.length + '___';
      tokens.push(`<span class="${cls}">${escapeHTML(match)}</span>`);
      return id;
    }

    let out = source;

    // 1. Comments
    out = out.replace(blockComments, m => saveToken(m, 'c-comm'));
    out = out.replace(lineComments, m => saveToken(m, 'c-comm'));

    // 2. Preprocessors & Strings
    out = out.replace(preprocessors, m => saveToken(m, 'c-pre'));
    out = out.replace(strings, m => saveToken(m, 'c-str'));

    // 3. Types & Keywords
    out = out.replace(types, m => saveToken(m, 'c-type'));
    out = out.replace(keywords, m => saveToken(m, 'c-kw'));

    // 4. Numbers
    out = out.replace(numbers, m => saveToken(m, 'c-num'));

    // 5. Function calls
    out = out.replace(functions, m => saveToken(m, 'c-fn'));

    // Escape raw code
    out = escapeHTML(out);

    // Restore tokens
    for (let i = 0; i < tokens.length; i++) {
      out = out.replace('___TOK_' + i + '___', tokens[i]);
    }

    return out;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── AI TUTOR & CHAT LOGIC ─────────────────────────────────────────────────
  async function loadModels() {
    try {
      const resp = await fetch('/api/models');
      if (!resp.ok) throw new Error('Không lấy được models');
      const data = await resp.json();
      availableProviders = data.providers || [];
      renderModelSelector();
    } catch (e) {
      console.warn('Lỗi lấy model từ server:', e.message);
      renderFallbackModels();
    }
  }

  function renderModelSelector() {
    elModelSelect.innerHTML = '';
    let hasSelected = false;
    let anyConfigured = false;

    availableProviders.forEach(prov => {
      const group = document.createElement('optgroup');
      const confLabel = prov.configured ? '' : ' (Chưa cấu hình key)';
      group.label = prov.name + confLabel;

      if (prov.configured) anyConfigured = true;

      prov.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.display + (prov.configured ? '' : ' - Chưa cấu hình');
        if (!prov.configured) {
          opt.disabled = true;
        } else if (!hasSelected && (m.id === selectedModel || !selectedModel)) {
          opt.selected = true;
          selectedModel = m.id;
          hasSelected = true;
        }
        group.appendChild(opt);
      });

      elModelSelect.appendChild(group);
    });

    // If previously saved model is not configured, pick the first configured model
    if (!hasSelected && anyConfigured) {
      for (const prov of availableProviders) {
        if (prov.configured && prov.models.length > 0) {
          selectedModel = prov.models[0].id;
          elModelSelect.value = selectedModel;
          break;
        }
      }
    }

    // Save selection
    localStorage.setItem('utc_selected_model', selectedModel);

    // Show warning banner if no key is configured
    if (!anyConfigured) {
      showAiBanner(
        '⚠️ <strong>Chưa cấu hình API Key:</strong> Server chưa có GEMINI_API_KEY. Vui lòng sao chép file <code>.env.example</code> thành <code>.env</code> và điền key để dùng tính năng Hỏi AI.<br><em>Các chức năng xem đề, làm nháp và xem lời giải vẫn hoạt động bình thường!</em>'
      );
    } else {
      hideAiBanner();
    }
  }

  function renderFallbackModels() {
    elModelSelect.innerHTML = `
      <optgroup label="Google Gemini">
        <option value="gemini-2.0-flash" selected>Gemini 2.0 Flash</option>
        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
      </optgroup>
    `;
    selectedModel = 'gemini-2.0-flash';
  }

  function showAiBanner(html) {
    elAiStatusBanner.innerHTML = html;
    elAiStatusBanner.style.display = 'block';
  }

  function hideAiBanner() {
    elAiStatusBanner.style.display = 'none';
    elAiStatusBanner.innerHTML = '';
  }

  function renderChatForCurrentQuestion() {
    const q = questions[currentQIndex];
    if (!q) return;

    const chatHistory = getQChat(q.id);
    elAiChatBody.innerHTML = '';

    if (chatHistory.length === 0) {
      elAiChatBody.innerHTML = `
        <div class="ai-empty-state">
          👋 Đang mở <strong>${escapeHTML(q.title)}</strong>.<br><br>
          Tôi là gia sư AI cho đề này. Hãy bấm các nút hỗ trợ hoặc hỏi trực tiếp để tôi gợi ý từng bước nhé!
        </div>
      `;
      return;
    }

    chatHistory.forEach(msg => {
      appendChatMessageToDOM(msg);
    });

    scrollChatToBottom();
  }

  function appendChatMessageToDOM(msg) {
    // Remove empty state if present
    const emptyState = elAiChatBody.querySelector('.ai-empty-state');
    if (emptyState) emptyState.remove();

    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg ' + msg.role;

    const senderRow = document.createElement('div');
    senderRow.className = 'ai-msg-sender';

    if (msg.role === 'user') {
      senderRow.textContent = 'Bạn';
    } else {
      const modelName = msg.displayModel || msg.model || 'Gia sư AI';
      senderRow.innerHTML = `<span>Gia sư AI</span> <span class="ai-model-tag">${escapeHTML(modelName)}</span>`;
    }

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'ai-msg-bubble';
    bubbleEl.innerHTML = formatMarkdown(msg.content);

    msgEl.appendChild(senderRow);
    msgEl.appendChild(bubbleEl);
    elAiChatBody.appendChild(msgEl);
  }

  function scrollChatToBottom() {
    elAiChatBody.scrollTop = elAiChatBody.scrollHeight;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let out = escapeHTML(text);

    // Code blocks ```c ... ```
    out = out.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code `...`
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **text**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italics *text*
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Newlines
    out = out.replace(/\n/g, '<br>');

    return out;
  }

  // ─── GỬI TIN NHẮN TỚI AI ──────────────────────────────────────────────────
  async function sendAiMessage(promptText, customUserDisplay) {
    const q = questions[currentQIndex];
    if (!q) return;

    const draftCode = getQDraft(q.id);

    // System prompt for Tutor
    const systemPrompt = `Bạn là Gia sư môn "Tin học cơ sở" (ngôn ngữ lập trình C) tại trường Đại học Giao thông Vận tải (UTC).
Sinh viên đang làm câu: "${q.title}" thuộc nhóm đề "${q.group}" (mã: ${q.id}).

ĐỀ BÀI:
${q.statement}

Ý TƯỞNG GIẢI THUẬT CHUẨN:
${q.approach}

CODE C MẪU CỦA ĐỀ NÀY (ĐÃ ĐƯỢC CUNG CẤP):
${q.code}

QUY TẮC CẦN TUÂN THỦ NGHIÊM NGẶT:
1. Trả lời bằng tiếng Việt thân thiện, chuẩn mực sư phạm, ngắn gọn, súc tích và dễ hiểu.
2. MẶC ĐỊNH CHỈ GỢI Ý TỪNG BƯỚC một để sinh viên tự động não làm tiếp. TUYỆT ĐỐI KHÔNG đưa ngay toàn bộ lời giải hoàn chỉnh trừ khi sinh viên yêu cầu rõ ràng.
3. Khi viết hoặc gợi ý code C, BẮT BUỘC tuân thủ phong cách của templates/mau.c:
   - Đặt các hàm xử lý trước hàm main (main ở dưới cùng).
   - Tên hàm dùng tiếng Việt không dấu (ví dụ: nhapDay, inDay, tinhTong, xuLy, timMax...).
4. "Tìm lỗi trong code của tôi": Hãy chỉ rõ dòng hoặc đoạn code đang có vấn đề (lỗi cú pháp, logic, chia cho 0, tràn số...), giải thích vì sao bị lỗi và đưa một bộ dữ liệu test case nhỏ để sinh viên tự kiểm tra. CHỈ nói đã biên dịch hoặc chạy thử khi thực sự có kết quả từ trình biên dịch.
5. "Gợi ý bước tiếp theo": Nếu ô code còn trống, gợi ý nên viết hàm nào trước. Nếu đã viết một phần, gợi ý một bước kế tiếp.
6. "Giải thích đoạn code": Giải thích rõ cơ chế và luôn minh họa bằng ví dụ thực tế lấy từ chính đề bài câu hiện tại.`;

    // Add user message to history
    const userMsg = {
      role: 'user',
      content: customUserDisplay || promptText
    };

    const chatHistory = getQChat(q.id);
    chatHistory.push(userMsg);
    setQChat(q.id, chatHistory);
    appendChatMessageToDOM(userMsg);
    scrollChatToBottom();

    // Disable send button while waiting
    elBtnSendAi.disabled = true;
    elBtnSendAi.textContent = '...';

    // Temporary loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-msg assistant';
    loadingEl.id = 'ai-loading-indicator';
    loadingEl.innerHTML = `
      <div class="ai-msg-sender"><span>Gia sư AI</span></div>
      <div class="ai-msg-bubble" style="font-style: italic; color: var(--text-muted);">Đang suy nghĩ...</div>
    `;
    elAiChatBody.appendChild(loadingEl);
    scrollChatToBottom();

    try {
      // Build messages array for API: only send messages for this current question
      // Also format messages properly
      const apiMessages = chatHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          systemPrompt: systemPrompt
        })
      });

      const data = await resp.json();
      loadingEl.remove();

      if (!resp.ok) {
        let errDesc = data.error || 'Lỗi gọi API AI';
        if (resp.status === 403 || data.code === 'NOT_CONFIGURED') {
          showAiBanner(`⚠️ ${escapeHTML(errDesc)}`);
        } else if (resp.status === 429 || data.code === 'QUOTA_EXCEEDED') {
          showAiBanner(`⏳ API hết hạn mức hoặc giới hạn tần suất. Vui lòng kiểm tra lại quota hoặc thử lại sau.`);
        }

        const errMsg = {
          role: 'assistant',
          content: `❌ **Thông báo:** ${errDesc}`,
          model: selectedModel,
          displayModel: 'Lỗi'
        };
        chatHistory.push(errMsg);
        setQChat(q.id, chatHistory);
        appendChatMessageToDOM(errMsg);
      } else {
        hideAiBanner();
        const aiMsg = {
          role: 'assistant',
          content: data.reply,
          model: data.model,
          displayModel: data.displayModel || data.model
        };
        chatHistory.push(aiMsg);
        setQChat(q.id, chatHistory);
        appendChatMessageToDOM(aiMsg);
      }
    } catch (err) {
      loadingEl.remove();
      const errMsg = {
        role: 'assistant',
        content: `❌ **Lỗi kết nối server:** ${err.message}. Hãy kiểm tra xem server backend đã chạy chưa.`,
        model: selectedModel,
        displayModel: 'Lỗi'
      };
      chatHistory.push(errMsg);
      setQChat(q.id, chatHistory);
      appendChatMessageToDOM(errMsg);
    } finally {
      elBtnSendAi.disabled = false;
      elBtnSendAi.textContent = 'Gửi';
      scrollChatToBottom();
    }
  }

  // ─── GẮN SỰ KIỆN (EVENT LISTENERS) ─────────────────────────────────────────
  function bindEvents() {
    // 1. Search input
    let searchTimeout = null;
    elSearchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value;
        renderQuestionList();
      }, 150);
    });

    // 2. Filter tabs
    elFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderQuestionList();
      });
    });

    // 3. Navigation Prev / Next
    elBtnPrev.addEventListener('click', () => {
      if (currentQIndex > 0) switchQuestion(currentQIndex - 1);
    });

    elBtnNext.addEventListener('click', () => {
      if (currentQIndex < questions.length - 1) switchQuestion(currentQIndex + 1);
    });

    // 4. Mark Status Buttons
    elBtnMarkReview.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const cur = getQStatus(q.id);
      setQStatus(q.id, cur === 'review' ? '' : 'review');
    });

    elBtnMarkDone.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const cur = getQStatus(q.id);
      setQStatus(q.id, cur === 'done' ? '' : 'done');
    });

    // 5. Code Editor Auto-Save with Debounce
    let saveDebounce = null;
    elCodeEditor.addEventListener('input', () => {
      elSaveStatus.textContent = 'Đang lưu...';
      elSaveStatus.style.color = 'var(--warning)';
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => {
        const q = questions[currentQIndex];
        setQDraft(q.id, elCodeEditor.value);
        renderQuestionList(); // Update draft icon
      }, 500);
    });

    // Tab key indentation support in code editor
    elCodeEditor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = elCodeEditor.selectionStart;
        const end = elCodeEditor.selectionEnd;
        const val = elCodeEditor.value;
        elCodeEditor.value = val.substring(0, start) + '    ' + val.substring(end);
        elCodeEditor.selectionStart = elCodeEditor.selectionEnd = start + 4;
        // Trigger auto-save
        elCodeEditor.dispatchEvent(new Event('input'));
      }
    });

    // 6. Download Draft File (.c)
    elBtnDownloadDraft.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const content = elCodeEditor.value || '// Bài nháp trống\n';
      const filename = q.id + '_bai_nhap.c';
      downloadFile(filename, content);
    });

    // 7. Reset Draft
    elBtnResetDraft.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn xóa bản nháp của câu này và viết lại từ đầu không?')) {
        const q = questions[currentQIndex];
        elCodeEditor.value = '';
        setQDraft(q.id, '');
        elSaveStatus.textContent = 'Đã xóa bản nháp';
        elSaveStatus.style.color = 'var(--text-muted)';
        renderQuestionList();
      }
    });

    // 8. Toggle Solution
    elBtnToggleSolution.addEventListener('click', toggleSolution);

    // 9. Copy Solution Code
    elBtnCopyCode.addEventListener('click', () => {
      const q = questions[currentQIndex];
      if (!q.code) return;
      navigator.clipboard.writeText(q.code).then(() => {
        const orig = elBtnCopyCode.innerHTML;
        elBtnCopyCode.innerHTML = '✅ Đã chép!';
        setTimeout(() => { elBtnCopyCode.innerHTML = orig; }, 1800);
      }).catch(err => {
        alert('Không sao chép được: ' + err);
      });
    });

    // 10. Download Solution File
    elBtnDownloadSolution.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const content = q.code || '';
      const filename = q.id + '.c';
      downloadFile(filename, content);
    });

    // 11. Model Selector Change
    elModelSelect.addEventListener('change', e => {
      selectedModel = e.target.value;
      localStorage.setItem('utc_selected_model', selectedModel);
    });

    // 12. AI Fast Action: Gợi ý bước tiếp theo
    elBtnAiHint.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const draft = elCodeEditor.value.trim();
      let prompt = '';
      if (!draft) {
        prompt = `Tôi chưa viết code cho câu này. Hãy gợi ý cho tôi nên khai báo thư viện gì và viết hàm xử lý nào trước (theo mẫu templates/mau.c: đặt hàm trước main, tên hàm tiếng Việt không dấu). Chỉ gợi ý 1 bước để tôi bắt đầu.`;
      } else {
        prompt = `Đây là code tôi đang viết dở trong bài nháp:\n\`\`\`c\n${draft}\n\`\`\`\nHãy xem code trên và gợi ý đúng 1 bước tiếp theo tôi cần làm. Không đưa toàn bộ code giải.`;
      }
      sendAiMessage(prompt, '💡 Gợi ý bước tiếp theo cho bài đang làm');
    });

    // 13. AI Fast Action: Tìm lỗi trong code
    elBtnAiFindBugs.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const draft = elCodeEditor.value.trim();
      if (!draft) {
        alert('Ô bài nháp đang trống! Hãy viết một đoạn code trước khi bấm tìm lỗi nhé.');
        return;
      }
      const prompt = `Đây là bài nháp tôi đang viết cho câu này:\n\`\`\`c\n${draft}\n\`\`\`\nHãy tìm lỗi trong code trên. Chỉ ra dòng hoặc đoạn code có vấn đề, giải thích vì sao và cho một bộ test case nhỏ để tôi tự kiểm tra. (Lưu ý: Chỉ nói đã biên dịch hoặc chạy thử khi thực sự có kết quả từ trình biên dịch).`;
      sendAiMessage(prompt, '🔍 Tìm lỗi trong code bài nháp của tôi');
    });

    // 14. AI Fast Action: Giải thích đoạn code
    elBtnAiExplain.addEventListener('click', () => {
      const q = questions[currentQIndex];
      const selected = window.getSelection().toString().trim();

      if (selected) {
        const prompt = `Tôi vừa bôi đen đoạn code sau:\n\`\`\`c\n${selected}\n\`\`\`\nHãy giải thích cặn kẽ ý nghĩa và hoạt động của đoạn code này, lấy ví dụ minh họa trực tiếp từ dữ liệu câu này.`;
        sendAiMessage(prompt, `📖 Giải thích đoạn code đã bôi đen: "${selected.slice(0, 45)}${selected.length > 45 ? '...' : ''}"`);
      } else {
        // No selection: explain the overall approach or code solution
        const prompt = `Tôi chưa bôi đen đoạn code cụ thể nào. Hãy giải thích ngắn gọn ý tưởng thuật toán và các hàm chính trong bài toán "${q.title}" kèm ví dụ đầu vào/đầu ra cụ thể của câu này.`;
        sendAiMessage(prompt, '📖 Giải thích thuật toán và hàm xử lý chính của câu này');
      }
    });

    // 15. Send Chat Input
    elBtnSendAi.addEventListener('click', handleUserChatSend);

    elAiUserInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserChatSend();
      }
    });

    // 16. Clear Chat for current question
    elBtnClearChat.addEventListener('click', () => {
      const q = questions[currentQIndex];
      if (confirm(`Bạn có chắc muốn xóa lịch sử trò chuyện của câu "${q.title}" không?`)) {
        setQChat(q.id, []);
        renderChatForCurrentQuestion();
      }
    });
  }

  function handleUserChatSend() {
    const text = elAiUserInput.value.trim();
    if (!text) return;
    elAiUserInput.value = '';
    sendAiMessage(text, text);
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── START APP ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
