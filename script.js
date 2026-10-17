/* =========================================================
   Doğru Reklam Merkezi — Etkileşimler ve 3D sahneler
   ---------------------------------------------------------
   REPLIT NOTU: Teklif formunu gerçekten almak için aşağıdaki
   TEKLIF_ENDPOINT değerine kendi sunucu adresinizi yazın
   (örn. '/api/teklif'). Boş bırakılırsa form yalnızca
   tarayıcı konsoluna yazar ve başarı ekranını gösterir.
   ========================================================= */
const TEKLIF_ENDPOINT = '';

(() => {
  'use strict';

  /* ---------- Yardımcılar ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const trUpper = (s) => s.toLocaleUpperCase('tr-TR');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isSmall = () => window.innerWidth < 768;

  // 3D kütüphanesi (Three.js) CDN'den yalnızca bir kez yüklenir
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
  let threePromise = null;
  const loadThree = () => (threePromise = threePromise || import(THREE_URL));

  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* =======================================================
     1. Kaydırma: üst menü, ilerleme çubuğu, aktif link, mobil buton
     ======================================================= */
  const header = $('.site-header');
  const progressBar = $('.scroll-progress span');
  const stickyCta = $('.sticky-cta');
  const heroEl = $('.hero');
  const ctaEl = $('#iletisim');
  const navLinks = $$('.site-nav a');
  const navSections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const stickyAvoid = $$('main [data-teklif]');
  const scrollHandlers = [];
  let ticking = false;
  let heroScroll = 0;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; scrollHandlers.forEach((fn) => fn()); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  scrollHandlers.push(() => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

    const heroRect = heroEl.getBoundingClientRect();
    heroScroll = clamp(-heroRect.top / heroRect.height, 0, 1);

    // Mobil sabit buton: ekranda başka bir "Teklif Al" butonu ya da etkileşimli alan görünüyorsa gizlenir
    const ctaTop = ctaEl.getBoundingClientRect().top;
    const otherCtaVisible = stickyAvoid.some((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.bottom > 0 && r.top < innerHeight - 20;
    });
    const showSticky = heroRect.bottom < 80 && ctaTop > innerHeight - 40 && !otherCtaVisible &&
      !document.body.classList.contains('modal-open') && !document.body.classList.contains('menu-open');
    stickyCta.classList.toggle('is-visible', showSticky);

    let current = '';
    const line = innerHeight * 0.4;
    navSections.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      if (r.top < line && r.bottom > line) current = sec.id;
    });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current));
  });

  /* ---------- Mobil menü ---------- */
  const menuBtn = $('.menu-toggle');
  const menu = $('#mobil-menu');
  let menuTimer = null;

  function setMenu(open) {
    clearTimeout(menuTimer);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    } else {
      menu.classList.remove('is-open');
      menuTimer = setTimeout(() => { menu.hidden = true; }, reduceMotion ? 0 : 520);
    }
    onScroll();
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  addEventListener('resize', () => {
    if (innerWidth >= 1024 && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /* =======================================================
     2. Hizmet şeridi (kaydırma yönüne ve hızına tepki verir)
     ======================================================= */
  (function marquee() {
    const band = $('.band');
    const track = $('.band__track', band);
    if (!band || reduceMotion) return;
    let x = 0, w = 0, visible = false, running = false, last = 0, dir = 1, lastY = scrollY, boost = 0;
    const measure = () => { w = track.firstElementChild.getBoundingClientRect().width; };
    measure();
    addEventListener('resize', measure);
    if (document.fonts) document.fonts.ready.then(measure);

    addEventListener('scroll', () => {
      const dy = scrollY - lastY;
      lastY = scrollY;
      if (dy !== 0) dir = dy > 0 ? 1 : -1;
      boost = Math.min(boost + Math.abs(dy) * 0.8, 900);
    }, { passive: true });

    function tick(now) {
      if (!visible) { running = false; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      x -= (40 + boost) * dt * dir;
      boost *= 0.9;
      if (w > 0) { if (x <= -w) x += w; if (x > 0) x -= w; }
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      requestAnimationFrame(tick);
    }
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    }).observe(band);
  })();

  /* =======================================================
     3. Hizmetler: canlı reklam önizlemesi
     ======================================================= */
  (function services() {
    const input = $('#isletme-adi');
    if (!input) return;
    const DEFAULT_NAME = 'İşletmenizin Adı';
    const nameEls = $$('[data-name]');
    const initialEls = $$('[data-initial]');
    const domainEls = $$('[data-domain]');
    const handleEls = $$('[data-handle]');
    const TR_MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    const slug = (s) => s.replace(/[çğıİöşüÇĞÖŞÜâîû]/g, (c) => TR_MAP[c]).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);

    function updateName() {
      const v = input.value.replace(/\s+/g, ' ').trim();
      const name = v || DEFAULT_NAME;
      nameEls.forEach((el) => { el.textContent = name; });
      initialEls.forEach((el) => { el.textContent = trUpper(name.charAt(0)); });
      const s = slug(v) || 'isletmenizinadi';
      domainEls.forEach((el) => { el.textContent = s + '.com'; });
      handleEls.forEach((el) => { el.textContent = s; });
    }
    input.addEventListener('input', updateName);

    /* --- Sekmeler --- */
    const seg = $('.seg');
    const tabs = $$('.seg__btn', seg);
    const flip = $('.stage__flip');
    const mocks = $$('[data-mock]');
    const note = $('[data-note]');
    const tiles = $('.tiles');
    const NOTES = {
      meta: 'Görsele çift dokunun ya da kalbe basın.',
      sosyal: 'Kutucuklara dokunun, paylaşım planını görün.',
    };
    let current = 'meta';
    let swapToken = 0;

    function showMock(key) {
      mocks.forEach((m) => { m.hidden = m.dataset.mock !== key; });
      note.textContent = NOTES[key];
      if (key === 'sosyal') {
        tiles.classList.remove('is-in');
        void tiles.offsetWidth;
        tiles.classList.add('is-in');
      }
    }

    async function swap(key) {
      const my = ++swapToken;
      if (reduceMotion || !flip.animate) { showMock(key); return; }
      flip.getAnimations().forEach((a) => a.cancel());
      const out = flip.animate(
        [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-75deg)', opacity: 0 }],
        { duration: 220, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
      );
      try { await out.finished; } catch (e) { return; }
      if (my !== swapToken) return;
      showMock(key);
      out.cancel();
      flip.animate(
        [{ transform: 'rotateY(75deg)', opacity: 0 }, { transform: 'rotateY(0deg)', opacity: 1 }],
        { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }

    function selectTab(i, focus) {
      const key = tabs[i].dataset.tab;
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      seg.style.setProperty('--idx', String(i));
      if (focus) tabs[i].focus();
      if (key === current) return;
      current = key;
      swap(key);
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(i));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); selectTab(n, true); }
      });
    });

    const stage = $('.stage');

    /* --- Meta: beğeni --- */
    const media = $('.post__media');
    const burst = $('.post__burst');
    const likeBtn = $('.post__like');
    let lastTap = 0, lastLike = 0;
    function like(force) {
      const on = typeof force === 'boolean' ? force : likeBtn.getAttribute('aria-pressed') !== 'true';
      likeBtn.setAttribute('aria-pressed', String(on));
      if (on) {
        lastLike = Date.now();
        burst.classList.remove('is-on');
        void burst.getBoundingClientRect();
        burst.classList.add('is-on');
      }
    }
    media.style.touchAction = 'manipulation';
    media.addEventListener('dblclick', () => { if (Date.now() - lastLike > 400) like(true); });
    media.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') return;
      const now = Date.now();
      if (now - lastTap < 330) like(true);
      lastTap = now;
    });
    media.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); like(true); }
    });
    likeBtn.addEventListener('click', () => like());

    /* --- Sosyal medya: kutucuk çevirme --- */
    $$('.tile', tiles).forEach((tile) => {
      tile.addEventListener('click', () => tile.classList.toggle('is-flipped'));
    });

    /* --- Sahne eğimi (fare ile) --- */
    if (finePointer && !reduceMotion) {
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        stage.style.setProperty('--ry', (nx * 12).toFixed(2) + 'deg');
        stage.style.setProperty('--rx', (-ny * 9).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', () => {
        stage.style.setProperty('--ry', '0deg');
        stage.style.setProperty('--rx', '0deg');
      });
    }
  })();

  /* =======================================================
     4. Süreç zaman çizelgesi
     ======================================================= */
  (function processLine() {
    const steps = $('.steps');
    if (!steps) return;
    const items = $$('.step', steps);
    scrollHandlers.push(() => {
      const r = steps.getBoundingClientRect();
      const line = innerHeight * 0.62;
      const p = clamp((line - r.top - 28) / Math.max(1, r.height - 56), 0, 1);
      steps.style.setProperty('--p', p.toFixed(4));
      items.forEach((it) => {
        const m = it.querySelector('.step__mark').getBoundingClientRect();
        it.classList.toggle('is-done', m.top + m.height / 2 < line);
      });
    });
  })();

  /* =======================================================
     5. Paket kartları: 3D eğim
     ======================================================= */
  if (finePointer && !reduceMotion) {
    $$('.pack').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (nx * 8).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-ny * 7).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* =======================================================
     6. Yorumlar: müşteri videoları
     ======================================================= */
  (function testimonialVideos() {
    const cards = $$('.video-card');
    if (!cards.length) return;
    const videos = cards.map((c) => $('video', c));

    cards.forEach((card, i) => {
      const video = videos[i];
      const play = $('.video-card__play', card);
      const markMissing = () => card.classList.add('is-missing');

      video.addEventListener('error', markMissing);
      video.addEventListener('loadedmetadata', () => {
        card.classList.remove('is-missing');
        card.classList.toggle('is-landscape', video.videoWidth > video.videoHeight);
      });
      // Video dosyası henüz eklenmemişse boş kartı göster
      if (video.error || video.networkState === 3) markMissing();

      play.addEventListener('click', () => {
        videos.forEach((v) => { if (v !== video) v.pause(); });
        video.controls = true;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      });
      video.addEventListener('play', () => {
        card.classList.add('is-playing');
        videos.forEach((v) => { if (v !== video && !v.paused) v.pause(); });
      });
      video.addEventListener('pause', () => card.classList.remove('is-playing'));
      video.addEventListener('ended', () => {
        card.classList.remove('is-playing');
        video.controls = false;
        video.currentTime = 0;
      });
    });

    // Ekrandan çıkan video otomatik durur
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (!e.isIntersecting) $('video', e.target).pause(); });
    }, { threshold: 0.25 });
    cards.forEach((c) => io.observe(c));
  })();

  /* =======================================================
     7. Teklif formu (iki adımlı)
     ======================================================= */
  async function teklifGonder(veri) {
    if (TEKLIF_ENDPOINT) {
      const res = await fetch(TEKLIF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(veri),
      });
      if (!res.ok) throw new Error('Sunucu hatası: ' + res.status);
      return;
    }
    console.info('[Teklif talebi]', veri);
    await sleep(900);
  }

  (function quoteForm() {
    const dialog = $('#teklif-modal');
    const form = $('form', dialog);
    const steps = $$('.form-step', form);
    const stepLabel = $('[data-step-label]', form);
    const title = $('[data-title]', form);
    const bar = $('.modal__progress span', form);
    const submitBtn = $('[data-submit]', form);
    const formError = $('[data-form-error]', form);
    const doneTitle = $('.form-done h3', form);
    const TITLES = { 1: 'İşletmenizi anlatın', 2: 'Size nasıl ulaşalım?' };
    let step = 1;
    let trigger = null;
    let downOnBackdrop = false;
    title.tabIndex = -1;

    function go(n) {
      step = n;
      steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
      dialog.classList.toggle('is-done', n === 3);
      if (n < 3) {
        stepLabel.textContent = `Adım ${n} / 2`;
        title.textContent = TITLES[n];
        bar.style.width = n === 1 ? '50%' : '100%';
      }
      dialog.scrollTop = 0;
    }

    function focusFirst(el) {
      // Dokunmatik cihazlarda klavyenin aniden açılmaması için başlığa odaklan
      (finePointer ? el : title).focus({ preventScroll: true });
    }

    function clearErrors() {
      $$('[data-field]', form).forEach((f) => setError(f.dataset.field, ''));
      formError.textContent = '';
    }

    function open(paket, src) {
      if (document.body.classList.contains('menu-open')) setMenu(false);
      form.reset();
      clearErrors();
      go(1);
      if (paket) {
        const r = $$('input[name="paket"]', form).find((x) => x.value === paket);
        if (r) r.checked = true;
      }
      trigger = src || null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.body.classList.add('modal-open');
      onScroll();
      requestAnimationFrame(() => focusFirst(paket ? $('#f-isletme') : $('input[name="paket"]', form)));
    }

    function close() {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else { dialog.removeAttribute('open'); onClose(); }
    }
    function onClose() {
      document.body.classList.remove('modal-open');
      onScroll();
      if (trigger && document.contains(trigger) && trigger.offsetParent !== null) trigger.focus({ preventScroll: true });
    }
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dialog; });
    dialog.addEventListener('click', (e) => { if (e.target === dialog && downOnBackdrop) close(); });
    $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', close));

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-teklif]');
      if (!t) return;
      e.preventDefault();
      open(t.dataset.paket, t);
    });

    /* --- Doğrulama --- */
    function normPhone(v) {
      let d = v.replace(/\D/g, '');
      if (d.length === 12 && d.startsWith('90')) d = d.slice(2);
      if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
      return /^[2-5]\d{9}$/.test(d) ? '0' + d : null;
    }
    const RULES = {
      paket: () => (form.querySelector('input[name="paket"]:checked') ? '' : 'Lütfen ilgilendiğiniz hizmeti seçin.'),
      isletme: () => (form.isletme.value.trim().length >= 10 ? '' : 'İşletmenizi birkaç kelimeyle anlatın (en az 10 karakter).'),
      istek: () => (form.istek.value.trim().length >= 5 ? '' : 'Bizden ne beklediğinizi kısaca yazın.'),
      ad: () => { const v = form.ad.value.trim(); return v.length >= 3 && /\s/.test(v) ? '' : 'Lütfen adınızı ve soyadınızı yazın.'; },
      telefon: () => (normPhone(form.telefon.value) ? '' : 'Telefon numaranızı 10 haneli olarak yazın (örn. 0532 123 45 67).'),
      eposta: () => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.eposta.value.trim()) ? '' : 'Geçerli bir e-posta adresi yazın (örn. ad@isletmeniz.com).'),
      kvkk: () => (form.kvkk.checked ? '' : 'Devam etmek için aydınlatma metnini okuduğunuzu onaylayın.'),
    };

    function setError(key, msg) {
      const f = form.querySelector(`[data-field="${key}"]`);
      if (!f) return;
      f.classList.toggle('has-error', Boolean(msg));
      f.querySelector('.field__error').textContent = msg;
      const inp = f.querySelector('input:not([type="radio"]), textarea');
      if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function validate(keys) {
      let first = null;
      keys.forEach((k) => {
        const m = RULES[k]();
        setError(k, m);
        if (m && !first) first = k;
      });
      if (first) {
        const f = form.querySelector(`[data-field="${first}"]`);
        const el = f.querySelector('input, textarea');
        el.focus({ preventScroll: true });
        f.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      return !first;
    }
    const revalidate = (e) => {
      const f = e.target.closest('[data-field]');
      if (f && f.classList.contains('has-error')) setError(f.dataset.field, RULES[f.dataset.field]());
    };
    form.addEventListener('input', revalidate);
    form.addEventListener('change', revalidate);

    form.telefon.addEventListener('blur', () => {
      const n = normPhone(form.telefon.value);
      if (n) form.telefon.value = `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7, 9)} ${n.slice(9)}`;
    });

    function nextStep() {
      if (!validate(['paket', 'isletme', 'istek'])) return;
      go(2);
      requestAnimationFrame(() => focusFirst($('#f-ad')));
    }
    $('[data-next-step]', form).addEventListener('click', nextStep);
    $('[data-prev-step]', form).addEventListener('click', () => { go(1); focusFirst(form.isletme); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (step === 1) { nextStep(); return; }
      if (step !== 2) return;
      if (!validate(['ad', 'telefon', 'eposta', 'kvkk'])) return;

      const veri = {
        paket: form.querySelector('input[name="paket"]:checked').value,
        isletme: form.isletme.value.trim(),
        istek: form.istek.value.trim(),
        adSoyad: form.ad.value.trim(),
        telefon: normPhone(form.telefon.value),
        eposta: form.eposta.value.trim(),
        kvkkOnay: true,
        tarih: new Date().toISOString(),
        sayfa: location.href,
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor…';
      formError.textContent = '';
      try {
        await teklifGonder(veri);
        const firstName = veri.adSoyad.split(/\s+/)[0];
        $('[data-thanks-name]', form).textContent = firstName ? ' ' + firstName : '';
        go(3);
        doneTitle.focus({ preventScroll: true });
      } catch (err) {
        console.error(err);
        formError.textContent = 'Talebiniz gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Teklif talebini gönder';
      }
    });
  })();

  /* =======================================================
     8. Hero: logodaki D'nin 3D modeli
     ======================================================= */
  function makeEnvironment(THREE, renderer) {
    // Parlak yüzeyler için hafif yeşil tonlu bir "stüdyo" ortamı
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: 0xeef5f1, side: THREE.BackSide }));
    env.add(room);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0xb8d8c5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6.9;
    env.add(floor);
    const panel = (w, h, x, y, z, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    panel(7, 3, 0, 6.5, 2, 6);
    panel(3, 5, -6.5, 1.5, 3, 3.5);
    panel(3, 5, 6.5, 0.5, 1, 2.2);
    panel(6, 2, 0, 1, 6.5, 1.6);
    const tex = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return tex;
  }

  async function initHero3D() {
    const stage = $('.hero__stage');
    const canvas = $('.hero__canvas', stage);
    if (!stage || !canvas) return;

    let THREE;
    try { THREE = await loadThree(); } catch (e) { console.warn('3D kütüphanesi yüklenemedi:', e); return; }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { console.warn('WebGL desteklenmiyor:', e); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isSmall() ? 1.75 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.environment = makeEnvironment(THREE, renderer);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd6eadf, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    const mat = (hexColor, o = {}) => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hexColor), roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.16, ...o,
    });
    const mOrman = mat('#034732');
    const mDeniz = mat('#008148');
    const mBeyaz = mat('#ffffff', { roughness: 0.38, clearcoat: 0.6 });

    const extrude = (shape, depth, bevel = 0.04, seg = 4, curve = 32) => {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: seg, curveSegments: curve,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    const roundedRect = (x, y, w, h, r) => {
      const s = new THREE.Shape();
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    const dShape = (l, r, t, b, rad) => {
      const s = new THREE.Shape();
      s.moveTo(l, b);
      s.lineTo(l, t);
      s.lineTo(r - rad, t);
      s.absarc(r - rad, t - rad, rad, Math.PI / 2, 0, true);
      s.lineTo(r, b + rad);
      s.absarc(r - rad, b + rad, rad, 0, -Math.PI / 2, true);
      s.lineTo(l, b);
      return s;
    };

    const root = new THREE.Group();
    scene.add(root);
    const brand = new THREE.Group();
    brand.position.x = 0.55;
    root.add(brand);

    // D gövdesi
    const D_L = -0.8, D_R = 0.8, D_T = 1, D_B = -1, D_RAD = 0.92;
    const body = new THREE.Mesh(extrude(dShape(D_L, D_R, D_T, D_B, D_RAD), 0.44, 0.06, 5, 56), mDeniz);
    brand.add(body);

    // İç katman (Derin Orman)
    const ins = 0.14;
    const plate = new THREE.Mesh(extrude(dShape(D_L + ins, D_R - ins, D_T - ins, D_B + ins, D_RAD - ins), 0.12, 0.03, 3, 56), mOrman);
    plate.position.z = 0.35;
    brand.add(plate);

    // Onay işareti (logodaki kıvrımlı tik)
    const ck = new THREE.Shape();
    ck.moveTo(-0.62, -0.18);
    ck.quadraticCurveTo(-0.37, -0.15, -0.14, -0.31);
    ck.quadraticCurveTo(0.08, 0.12, 0.57, 0.5);
    ck.quadraticCurveTo(0.16, 0.0, -0.095, -0.64);
    ck.quadraticCurveTo(-0.32, -0.3, -0.62, -0.18);
    const check = new THREE.Mesh(extrude(ck, 0.08, 0.022, 3, 32), mBeyaz);
    check.position.set(0.02, 0.02, 0.49);
    brand.add(check);

    // Hız çizgileri (logodaki kademeli çubuklar)
    const BAR_W = [1.22, 1.09, 0.95, 0.8, 0.64, 0.52, 0.47];
    const BAR_H = 0.17;
    const barY = BAR_W.map((_, i) => D_T - BAR_H / 2 - i * ((D_T - D_B - BAR_H) / 6));
    const bars = BAR_W.map((w, i) => {
      const m = new THREE.Mesh(extrude(roundedRect(-w, -BAR_H / 2, w, BAR_H, 0.025), 0.3, 0.03, 2, 4), mDeniz);
      m.position.set(D_L + 0.05, barY[i], 0);
      m.scale.x = 0.001;
      brand.add(m);
      return m;
    });

    // Çubuklara doğru akan ince hız izleri
    const STREAKS = reduceMotion ? 0 : isSmall() ? 10 : 18;
    const streakGeo = new THREE.BoxGeometry(1, 0.03, 0.03);
    streakGeo.translate(-0.5, 0, 0);
    const streakMat = new THREE.MeshBasicMaterial({ color: 0x008148, transparent: true, opacity: 0.45 });
    const streaks = new THREE.InstancedMesh(streakGeo, streakMat, Math.max(1, STREAKS));
    streaks.count = STREAKS;
    brand.add(streaks);
    const dummy = new THREE.Object3D();
    const sData = [];
    const spawnStreak = (s, initial) => {
      s.row = Math.floor(Math.random() * BAR_W.length);
      s.end = D_L + 0.05 - BAR_W[s.row] - 0.06;
      s.x = initial ? s.end - Math.random() * 2.6 : s.end - 2.4 - Math.random() * 1.6;
      s.y = barY[s.row] + (Math.random() - 0.5) * 0.06;
      s.z = (Math.random() - 0.5) * 0.3;
      s.v = 1.4 + Math.random() * 1.8;
      s.len = 0.25 + Math.random() * 0.6;
      return s;
    };
    for (let i = 0; i < STREAKS; i++) sData.push(spawnStreak({}, true));

    // Etrafta süzülen pazarlama nesneleri
    const floaters = [];
    const addFloater = (obj, p, o = {}) => {
      obj.position.set(p[0], p[1], p[2]);
      obj.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
      obj.userData = {
        base: new THREE.Vector3(p[0], p[1], p[2]), rot0: obj.rotation.clone(),
        phase: Math.random() * Math.PI * 2, amp: o.amp || 0.09, speed: o.speed || 1, scale: o.scale || 1,
        spin: 0, popAt: -10, delay: o.delay || 0,
      };
      obj.scale.setScalar(0.001);
      root.add(obj);
      floaters.push(obj);
    };

    // Kalp (beğeni)
    {
      const s = new THREE.Shape();
      s.moveTo(5, 5);
      s.bezierCurveTo(5, 5, 4, 0, 0, 0);
      s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
      s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
      s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
      s.bezierCurveTo(16, 7, 16, 0, 10, 0);
      s.bezierCurveTo(7, 0, 5, 5, 5, 5);
      const g = new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelThickness: 1.8, bevelSize: 1.5, bevelSegments: 5, curveSegments: 24 });
      g.center();
      g.rotateZ(Math.PI);
      g.scale(0.027, 0.027, 0.027);
      addFloater(new THREE.Mesh(g, mDeniz), [1.95, 1.2, 0.4], { rz: -0.25, delay: 0.5 });
    }
    // Hedef tahtası + ok
    {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 20, 64), mOrman));
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.07, 20, 48), mDeniz));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), mBeyaz));
      const dart = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 12), mBeyaz);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = 0.36;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 16), mOrman);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = 0.04;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), mDeniz);
      fin.position.z = 0.64;
      const fin2 = fin.clone();
      fin2.rotation.z = Math.PI / 2;
      dart.add(shaft, tip, fin, fin2);
      dart.rotation.set(-0.5, 0.45, 0);
      g.add(dart);
      addFloater(g, [-2.15, 1.45, -0.2], { ry: 0.35, scale: 0.95, delay: 0.62 });
    }
    // Video (oynat) kutusu
    {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(extrude(roundedRect(-0.42, -0.3, 0.84, 0.6, 0.16), 0.14, 0.04, 4, 16), mBeyaz));
      const tri = new THREE.Shape();
      tri.moveTo(-0.09, -0.13); tri.lineTo(0.15, 0); tri.lineTo(-0.09, 0.13); tri.lineTo(-0.09, -0.13);
      const t = new THREE.Mesh(extrude(tri, 0.05, 0.02, 2, 4), mDeniz);
      t.position.z = 0.12;
      g.add(t);
      addFloater(g, [2.1, -0.75, 0.2], { ry: -0.35, scale: 1, delay: 0.74 });
    }
    // İmleç (tıklama)
    {
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.lineTo(0, -0.78); s.lineTo(0.2, -0.6); s.lineTo(0.34, -0.9);
      s.lineTo(0.47, -0.84); s.lineTo(0.33, -0.55); s.lineTo(0.58, -0.55); s.lineTo(0, 0);
      const g = extrude(s, 0.1, 0.03, 3, 4);
      g.center();
      addFloater(new THREE.Mesh(g, mOrman), [1.05, -1.5, 0.9], { rz: 0.15, ry: -0.3, scale: 0.85, delay: 0.86 });
    }
    // Yükselen grafik
    {
      const g = new THREE.Group();
      [0.32, 0.55, 0.82].forEach((h, i) => {
        const m = new THREE.Mesh(extrude(roundedRect(-0.09, 0, 0.18, h, 0.05), 0.18, 0.03, 3, 8), i === 2 ? mDeniz : mOrman);
        m.position.set((i - 1) * 0.27, -0.41, 0);
        g.add(m);
      });
      addFloater(g, [-1.8, -1.5, 0.45], { ry: 0.4, scale: 0.92, delay: 0.98 });
    }
    // Yorum balonu
    {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(extrude(roundedRect(-0.45, -0.26, 0.9, 0.52, 0.22), 0.14, 0.04, 4, 16), mBeyaz));
      const tail = new THREE.Shape();
      tail.moveTo(-0.3, -0.18); tail.lineTo(-0.38, -0.46); tail.lineTo(-0.08, -0.22); tail.lineTo(-0.3, -0.18);
      g.add(new THREE.Mesh(extrude(tail, 0.14, 0.04, 4, 4), mBeyaz));
      [-0.2, 0, 0.2].forEach((x) => {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), mDeniz);
        d.position.set(x, 0, 0.14);
        g.add(d);
      });
      addFloater(g, [0.4, 1.75, -0.5], { ry: 0.2, scale: 0.85, delay: 1.1 });
    }

    // Yumuşak zemin gölgesi
    {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(3,71,50,0.45)');
      grd.addColorStop(1, 'rgba(3,71,50,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -2.25;
      scene.add(shadow);
    }

    /* --- Boyutlandırma --- */
    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tanH = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(2.45 / tanH, 2.85 / (tanH * camera.aspect));
      camera.position.set(0, 0.35, dist + 0.4);
      camera.lookAt(0, -0.05, 0);
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(stage);
    resize();

    /* --- Etkileşim: sürükle, eğ, tıkla --- */
    const rot = { x: 0.06, y: -0.32, vy: 0 };
    const tilt = { x: 0, y: 0 };
    const pointer = { nx: 0, ny: 0 };
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let down = null;
    let boost = 0;
    let checkPopAt = -10;
    let lastHover = 0;

    const topLevel = (obj) => { let o = obj; while (o.parent && o.parent !== root) o = o.parent; return o; };
    function pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([brand, ...floaters], true).find((h) => h.object !== streaks);
      return hit ? topLevel(hit.object) : null;
    }

    canvas.addEventListener('pointerdown', (e) => {
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
      stage.classList.add('is-touched');
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (down && e.pointerId === down.id) {
        const dx = e.clientX - down.lastX, dy = e.clientY - down.lastY;
        down.lastX = e.clientX; down.lastY = e.clientY;
        down.moved += Math.abs(dx) + Math.abs(dy);
        rot.vy = dx * 0.0085;
        rot.y += rot.vy;
        rot.x = clamp(rot.x + dy * 0.005, -0.6, 0.6);
      } else if (finePointer) {
        const now = performance.now();
        if (now - lastHover > 60) {
          lastHover = now;
          canvas.classList.toggle('is-pointer', Boolean(pick(e.clientX, e.clientY)));
        }
      }
    });
    const endPointer = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const isClick = e.type === 'pointerup' && down.moved < 8;
      canvas.classList.remove('is-dragging');
      down = null;
      if (!isClick) return;
      const hit = pick(e.clientX, e.clientY);
      if (!hit) return;
      if (hit === brand) {
        checkPopAt = clock.elapsedTime;
        boost = 1;
        rot.vy += 0.16;
      } else {
        hit.userData.popAt = clock.elapsedTime;
        hit.userData.spin += Math.PI * 2;
      }
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', () => { pointer.nx = 0; pointer.ny = 0; canvas.classList.remove('is-pointer'); });

    /* --- Döngü --- */
    const clock = new THREE.Clock();
    const TAU = Math.PI * 2;
    let introT = reduceMotion ? 3 : 0;
    let running = false, visible = true, first = true;

    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      introT += dt;
      const ip = easeOutCubic(clamp(introT / 1.3, 0, 1));

      // Dönüş: sürükleme ataleti + boştayken hafif salınım
      const idleY = reduceMotion ? -0.32 : -0.32 + Math.sin(t * 0.45) * 0.24;
      if (!down) {
        rot.y += rot.vy;
        rot.vy *= 0.93;
        if (Math.abs(rot.vy) < 0.003) {
          const target = idleY + Math.round((rot.y - idleY) / TAU) * TAU;
          rot.y = lerp(rot.y, target, 0.035);
        }
        rot.x = lerp(rot.x, 0.06, 0.04);
      }
      const follow = finePointer && !down && !reduceMotion;
      tilt.x = lerp(tilt.x, follow ? -pointer.ny * 0.12 : 0, 0.06);
      tilt.y = lerp(tilt.y, follow ? pointer.nx * 0.22 : 0, 0.06);

      root.rotation.set(rot.x + tilt.x + heroScroll * 0.3, rot.y + tilt.y - (1 - ip) * 1.2 + heroScroll * 0.7, 0);
      root.scale.setScalar(lerp(0.8, 1, ip));
      root.position.y = heroScroll * 0.9;

      // Çubuklar: girişte büyür, sonra nabız gibi atar
      boost *= 0.95;
      bars.forEach((b, i) => {
        const grow = easeOutCubic(clamp((introT - 0.15 - i * 0.07) / 0.7, 0, 1));
        const pulse = reduceMotion ? 0 : Math.sin(t * 2.4 - i * 0.55) * 0.06;
        b.scale.x = Math.max(0.001, grow * (1 + pulse + boost * 0.18 * Math.sin(Math.PI * clamp(1 - boost, 0, 1) + i)));
      });

      // Hız izleri
      for (let i = 0; i < STREAKS; i++) {
        const s = sData[i];
        s.x += s.v * dt * (1 + boost * 3);
        if (s.x >= s.end) spawnStreak(s, false);
        const fade = clamp((s.end - s.x) / 0.7, 0, 1) * clamp((s.x - (s.end - 3.6)) / 0.6, 0, 1);
        dummy.position.set(s.x, s.y, s.z);
        dummy.scale.set(Math.max(0.001, s.len * fade * ip), 1, 1);
        dummy.updateMatrix();
        streaks.setMatrixAt(i, dummy.matrix);
      }
      if (STREAKS) streaks.instanceMatrix.needsUpdate = true;

      // Onay işareti "doğru!" vuruşu
      const pc = t - checkPopAt;
      const pop = pc < 0.6 ? Math.sin((pc / 0.6) * Math.PI) * (1 - pc / 0.6 * 0.4) : 0;
      check.scale.setScalar(1 + pop * 0.38);
      check.position.z = 0.49 + pop * 0.25;

      // Süzülen nesneler
      floaters.forEach((f) => {
        const u = f.userData;
        const appear = reduceMotion ? 1 : easeOutBack(clamp((introT - u.delay) / 0.6, 0, 1));
        const pt = t - u.popAt;
        const popS = pt < 0.5 ? Math.sin((pt / 0.5) * Math.PI) * 0.35 : 0;
        f.scale.setScalar(Math.max(0.001, u.scale * appear * (1 + popS)));
        const bob = reduceMotion ? 0 : Math.sin(t * u.speed + u.phase) * u.amp;
        f.position.set(u.base.x + pointer.nx * 0.08 * (u.base.z + 1), u.base.y + bob, u.base.z);
        if (u.spin > 0.001) { const d = u.spin * 0.12; u.spin -= d; f.rotation.y += d; }
        f.rotation.x = u.rot0.x + (reduceMotion ? 0 : Math.sin(t * 0.6 + u.phase) * 0.12);
        f.rotation.z = u.rot0.z + (reduceMotion ? 0 : Math.cos(t * 0.5 + u.phase) * 0.08);
      });

      renderer.render(scene, camera);
      if (first) { first = false; stage.classList.add('is-3d'); }
    }

    function start() {
      if (running || !visible || document.hidden) return;
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    }
    function stop() { running = false; }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }).observe(stage);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    start();
  }

  initHero3D().catch((e) => console.warn('3D sahne başlatılamadı:', e));
  onScroll();
})();
