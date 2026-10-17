/* =========================================================
   Doğru Reklam Merkezi — Teklif formu (Vercel sunucusuz fonksiyonu)
   ---------------------------------------------------------
   Formdan gelen talebi Resend üzerinden e-posta olarak gönderir.
   Vercel > Project > Settings > Environment Variables bölümüne:
     RESEND_API_KEY  = Resend'den aldığınız API anahtarı (zorunlu)
     TEKLIF_ALICI    = Talebin gideceği adres (isteğe bağlı,
                       varsayılan: dogrureklammerkezi@gmail.com)
   ========================================================= */

const ALICI = process.env.TEKLIF_ALICI || 'dogrureklammerkezi@gmail.com';
const GONDEREN = process.env.TEKLIF_GONDEREN || 'Doğru Reklam Merkezi <onboarding@resend.dev>';

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kisalt = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, hata: 'Yalnızca POST kabul edilir.' });
  }

  let veri = req.body;
  if (typeof veri === 'string') {
    try { veri = JSON.parse(veri); } catch (e) { veri = null; }
  }
  if (!veri || typeof veri !== 'object') {
    return res.status(400).json({ ok: false, hata: 'Geçersiz istek.' });
  }

  // Bot tuzağı: gizli alan doluysa sessizce başarılı dön
  if (veri.website) return res.status(200).json({ ok: true });

  const t = {
    paket: kisalt(veri.paket, 80),
    isletme: kisalt(veri.isletme, 3000),
    istek: kisalt(veri.istek, 3000),
    adSoyad: kisalt(veri.adSoyad, 120),
    telefon: kisalt(veri.telefon, 30),
    eposta: kisalt(veri.eposta, 160),
    tarih: kisalt(veri.tarih, 40),
    sayfa: kisalt(veri.sayfa, 300),
  };

  const epostaGecerli = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.eposta);
  if (!t.paket || t.isletme.length < 10 || t.istek.length < 5 || t.adSoyad.length < 3 || !t.telefon || !epostaGecerli || veri.kvkkOnay !== true) {
    return res.status(400).json({ ok: false, hata: 'Eksik veya hatalı alan var.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY tanımlı değil.');
    return res.status(500).json({ ok: false, hata: 'E-posta ayarı yapılmamış.' });
  }

  const tarih = new Date(t.tarih || Date.now()).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const satir = (k, v) => `<tr><td style="padding:8px 12px;background:#f3f8f5;color:#034732;font-weight:600;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 12px;color:#264139;white-space:pre-wrap">${esc(v)}</td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px">
      <h2 style="color:#034732;margin:0 0 12px">Yeni teklif talebi</h2>
      <table style="border-collapse:collapse;width:100%;border:1px solid #d8e7de">
        ${satir('Paket', t.paket)}
        ${satir('Ad soyad', t.adSoyad)}
        ${satir('Telefon', t.telefon)}
        ${satir('E-posta', t.eposta)}
        ${satir('İşletme', t.isletme)}
        ${satir('Beklenti', t.istek)}
        ${satir('KVKK onayı', 'Evet')}
        ${satir('Tarih', tarih)}
      </table>
      <p style="color:#566f66;font-size:13px">Bu e-postayı yanıtlayarak doğrudan müşteriye yazabilirsiniz.</p>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: GONDEREN,
        to: [ALICI],
        reply_to: t.eposta,
        subject: `Yeni teklif talebi: ${t.adSoyad} (${t.paket})`,
        html,
      }),
    });
    if (!r.ok) {
      console.error('Resend hatası', r.status, await r.text());
      return res.status(502).json({ ok: false, hata: 'E-posta gönderilemedi.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, hata: 'Sunucu hatası.' });
  }
};
