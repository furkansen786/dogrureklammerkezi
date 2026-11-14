# Doğru Reklam Merkezi — Web Sitesi

Tek sayfalık, mobil uyumlu, 3D logolu tanıtım sitesi. Saf HTML / CSS / JavaScript; kurulum veya derleme gerektirmez.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Ana sayfa (tüm bölümler ve teklif formu) |
| `style.css` | Tüm tasarım: renkler, yazı tipleri, mobil uyum |
| `script.js` | Etkileşimler, 3D logo, teklif formu |
| `kvkk.html` | KVKK Aydınlatma Metni |
| `cerez-politikasi.html` | Çerez Politikası |
| `404.html` | Bulunamayan sayfalar için markalı hata sayfası |
| `robots.txt` | Arama motorlarına taranacak alanları ve site haritasını bildirir |
| `sitemap.xml` | Site haritası; yeni sayfa eklendiğinde buraya da eklenmeli |
| `vercel.json` | Temiz adresler (`/kvkk`), yönlendirmeler, güvenlik ve önbellek başlıkları |
| `assets/` | Logo, favicon, paylaşım görseli (`og-image.png`) ve müşteri videoları |

## Yayına alma

Site Vercel'de yayında; GitHub'daki `main` dalına gelen her değişiklik otomatik olarak yayına alınır. Başka bir dala gönderilen değişiklikler için Vercel önce bir önizleme adresi oluşturur.

## SEO notları

- Her sayfanın `<head>` bölümünde `canonical` adresi var; yeni sayfa eklerken kendi adresini yazın ve `sitemap.xml` dosyasına ekleyin.
- Sayfa içi bağlantılar `.html` olmadan yazılır (`/kvkk`); `vercel.json` eski `.html` adreslerini otomatik yönlendirir.
- Dışarıdan yeni bir betik, yazı tipi veya görsel kaynağı eklerseniz `vercel.json` içindeki `Content-Security-Policy` satırına o adresi de ekleyin, yoksa tarayıcı onu engeller.
- `assets/` dosyaları bir hafta önbellekte tutulur; bir görseli değiştirince eski sürüm bazı ziyaretçilerde birkaç gün görünebilir. Hemen yansımasını istiyorsanız dosya adını değiştirin (ör. `logo-2.png`).

## Müşteri videoları

Üç memnuniyet videosu `assets/videolar/` klasöründe, web için küçültülmüş hâlde (720p, H.264) duruyor: `yorum-1.mp4`, `yorum-2.mp4`, `yorum-3.mp4`. Kapak görselleri `kapak-1.jpg`, `kapak-2.jpg`, `kapak-3.jpg`. Videoyu değiştirmek için aynı adla yeni dosyayı koymanız yeterli; dikey (9:16) ve 20 MB'ın altında MP4 önerilir.

## Teklif formu (Vercel + Resend)

Form, `api/teklif.js` adlı Vercel fonksiyonuna gönderilir; fonksiyon talebi Resend ile dogrureklammerkezi@gmail.com adresine e-posta olarak iletir. Çalışması için bir kez şu ayar gerekir:

1. resend.com'a **dogrureklammerkezi@gmail.com** adresiyle ücretsiz üye olun.
2. Resend panelinde **API Keys → Create API Key** ile bir anahtar oluşturup kopyalayın.
3. Vercel'de projeyi açın: **Settings → Environment Variables** → Key: `RESEND_API_KEY`, Value: kopyaladığınız anahtar → **Save**.
4. **Deployments** sekmesinde son yayının yanındaki **⋯ → Redeploy** ile siteyi yeniden yayınlayın.

İsteğe bağlı: `TEKLIF_ALICI` değişkeniyle talebin gideceği adresi değiştirebilirsiniz. Kendi alan adınızı Resend'de doğrularsanız `TEKLIF_GONDEREN` ile gönderen adresini de (ör. `Doğru Reklam Merkezi <form@alanadiniz.com>`) değiştirebilirsiniz.

## Yayına almadan önce

- Yasal metinler genel bir şablondur; bir hukukçuya kontrol ettirmeniz önerilir.
- Siteye ileride analiz veya reklam ölçüm aracı eklerseniz Çerez Politikası'nı güncelleyin ve bir çerez onay bildirimi ekleyin.

## Renkleri ve yazıları değiştirme

`style.css` dosyasının başındaki `:root` bloğunda tüm renkler tanımlıdır:

- `--orman: #034732` (Derin Orman)
- `--deniz: #008148` (Deniz Yeşili)

Başlıklar **Barlow Condensed**, metinler **Barlow** yazı tipiyle Google Fonts üzerinden yüklenir. 3D logo, jsDelivr üzerinden yüklenen Three.js kütüphanesiyle çalışır; internet bağlantısı olmayan bir ortamda yerine logonun düz görseli görünür.
