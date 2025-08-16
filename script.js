// planet-generator.js
// 학교 내부 전용 프런트엔드 스크립트
// ⚠️ OpenAI API 키는 절대 클라이언트(이 파일)에 넣지 마세요. 서버의 /api/generate가 호출하도록 구성합니다.

(function () {
  const el = (id) => document.getElementById(id);

  let planetSel, promptEl, styleSel, sizeSel, genBtn, spinner, statusBox, preview, dlWrap, dlLink, meta;

  function initRefs() {
    planetSel = el('planet');
    promptEl  = el('prompt');
    styleSel  = el('style');
    sizeSel   = el('size');
    genBtn    = el('generate');
    spinner   = el('spinner');
    statusBox = el('status');
    preview   = el('preview');
    dlWrap    = el('downloadWrap');
    dlLink    = el('downloadLink');
    meta      = el('meta');
  }

  function showStatus(msg, kind = 'info') {
    statusBox.textContent = msg;
    statusBox.className = `status ${kind}`;
    statusBox.classList.remove('hidden');
  }
  function hideStatus() { statusBox.classList.add('hidden'); }

  function showSpinner(on) {
    spinner.classList.toggle('hidden', !on);
    genBtn.disabled = on;
  }

  function setPreviewFromB64(b64) {
    const src = `data:image/png;base64,${b64}`;
    const img = new Image();
    img.src = src;
    img.alt = '생성된 이미지';
    preview.innerHTML = '';
    preview.appendChild(img);

    const blob = b64ToBlob(b64, 'image/png');
    const url = URL.createObjectURL(blob);
    dlLink.href = url;
    dlLink.download = makeFileName('png');
    dlWrap.classList.remove('hidden');
    meta.textContent = new Date().toLocaleString();
  }

  function setPreviewFromURL(url) {
    const img = new Image();
    img.src = url;
    img.alt = '생성된 이미지';
    img.referrerPolicy = 'no-referrer';
    preview.innerHTML = '';
    preview.appendChild(img);

    dlLink.href = url;
    dlLink.download = makeFileName('jpg');
    dlWrap.classList.remove('hidden');
    meta.textContent = new Date().toLocaleString();
  }

  function makeFileName(ext) {
    const p = (planetSel?.value || 'planet').replace(/\s+/g, '_');
    const ts = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').slice(0, 15);
    return `${p}_${ts}.${ext}`;
  }

  function b64ToBlob(b64, contentType = 'application/octet-stream', sliceSize = 512) {
    const byteChars = atob(b64);
    const byteArrays = [];
    for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
      const slice = byteChars.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: contentType });
  }

  async function generate() {
    hideStatus();
    dlWrap.classList.add('hidden');

    const userPrompt = (promptEl.value || '').trim();
    if (!userPrompt) { showStatus('프롬프트를 입력해주세요.', 'warn'); return; }

    const planet = planetSel.value;
    const planetStyle = planetSel.options[planetSel.selectedIndex].dataset.style || '';
    const style = styleSel.value;
    const size = sizeSel.value;

    const payload = { planet, planet_style: planetStyle, user_prompt: userPrompt, style, size };

    showSpinner(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let msg = '이미지 생성 요청이 실패했습니다.';
        try { const err = await res.json(); if (err?.message) msg += ` (서버: ${err.message})`; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();

      if (data.image_b64) {
        setPreviewFromB64(data.image_b64);
        showStatus('생성이 완료되었습니다.', 'info');
      } else if (data.image_url) {
        setPreviewFromURL(data.image_url);
        showStatus('생성이 완료되었습니다.', 'info');
      } else {
        throw new Error('서버 응답에 이미지 데이터가 없습니다.');
      }
    } catch (err) {
      console.error(err);
      showStatus('오류: ' + (err?.message || err), 'err');
    } finally {
      showSpinner(false);
    }
  }

  function bindEvents() {
    genBtn.addEventListener('click', generate);
    // Enter+Ctrl/Cmd 로도 전송
    promptEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        generate();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRefs();
    bindEvents();
  });
})();
