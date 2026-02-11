# Gazetecilik Mesleki Uygulama Rehberi

İletişim Fakültesi Gazetecilik bölümü için hazırlanan gayriresmi web tabanlı süreç takip rehberi.

Amaç:
- Öğrencilerin belge teslim ve staj sürecini adım adım netleştirmek
- Bölüm sekreteri, asistanlar ve öğretim üyeleri için görev akışını tek ekranda toplamak
- Resmi belge teslimi elden devam ederken dijital rehber ve takip desteği sağlamak

## Sayfa Ayrımı

- `ogrenci/index.html`: Öğrencilere açık, şifresiz rehber
- `komisyon/index.html`: Komisyon kabul/değerlendirme ekranı (şifre korumalı)
  - Şifre: `Medipol1453`

## Paylaşım Linkleri

- Öğrenci linki: `/ogrenci/` (alternatif: `/ogrenci.html`)
- Komisyon linki: `/komisyon/` (alternatif: `/komisyon.html`)
- Ana giriş (`/`) otomatik olarak öğrenci sayfasına yönlendirir.

GitHub Pages yayınında örnek:
- Öğrenci: `https://<kullanici-adi>.github.io/<repo-adi>/ogrenci/`
- Komisyon: `https://<kullanici-adi>.github.io/<repo-adi>/komisyon/`

## İçerik

- Rol bazlı kontrol listeleri (öğrenci, bölüm sekreteri, asistan, öğretim üyesi)
- Tarih planlayıcı (15 gün ve 20 gün kritik tarih hesaplama)
- Belge kontrol matrisi (EK-1...EK-9)
- Kurum uygunluk ön karar modülü
- Başvuru takip tablosu (tarayıcı içinde saklama + CSV dışa aktarma)
- Komisyon ekranında ortak veri senkronizasyonu (uzak JSON endpoint ile)

## Dosyalar

- `index.html`: Ana giriş (otomatik öğrenci yönlendirmesi)
- `ogrenci/index.html`: Öğrenci arayüzü
- `komisyon/index.html`: Komisyon arayüzü
- `styles.css`: Stil dosyası
- `app.js`: Etkileşim ve kayıt mantığı
- `commission-sync-config.js`: Komisyon ortak veri URL ayarı
- `docs/`: Paylaşılan PDF belgeler

## Yerel Çalıştırma

```bash
cd /Users/gurursonmez/Documents/mesleki-uygulama-rehberi
python3 -m http.server 8080
```

Sonra tarayıcıdan:
- [http://localhost:8080](http://localhost:8080) -> öğrenci sayfasına yönlenir
- [http://localhost:8080/ogrenci/](http://localhost:8080/ogrenci/)
- [http://localhost:8080/komisyon/](http://localhost:8080/komisyon/)

## Komisyon İçin Ortak Veri (Paylaşılan Kayıt)

Komisyon ekranındaki checkbox, karar formu ve takip tablosu verilerinin herkes için ortak kalması için
`commission-sync-config.js` içindeki URL'i doldurun:

```js
window.STAJ_COMMISSION_REMOTE_URL = "https://<firebase-db>.firebasedatabase.app/mesleki-uygulama.json";
```

Önerilen kurulum (Firebase Realtime Database):
1. Firebase'de bir proje açın ve Realtime Database oluşturun.
2. Database Rules içinde ilgili node için okuma/yazmayı açın (veya kendi güvenlik modelinizi uygulayın).
3. `commission-sync-config.js` dosyasına yukarıdaki URL'i yazın.
4. GitHub'a push edin.

Not: Komisyon ekranı yine sayfa şifresi (`Medipol1453`) ile açılır. URL boş bırakılırsa veriler yalnızca cihazdaki tarayıcıda kalır.
Komisyon ekranında yapılan değişiklikler için üstteki `İşlemi Yapan` alanına ad-soyad girilir; son güncelleme bilgisinde isim ve zaman görünür.

## GitHub Pages ile Yayınlama

1. GitHub'da yeni bir repo açın (örnek: `mesleki-uygulama-rehberi`).
2. Yerel repoyu bağlayın ve push edin:

```bash
cd /Users/gurursonmez/Documents/mesleki-uygulama-rehberi
git init
git add .
git commit -m "Mesleki uygulama rehberi ilk sürüm"
git branch -M main
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

3. GitHub üzerinde `Settings > Pages` bölümüne gidin.
4. Source olarak `Deploy from a branch` seçin.
5. Branch: `main`, folder: `/ (root)` seçip kaydedin.
6. Birkaç dakika içinde yayın linkiniz oluşur:
   - `https://<kullanici-adi>.github.io/<repo-adi>/`

## Not

Bu uygulama resmi başvuru sisteminin yerine geçmez; resmi süreç fakülte yönergesi ve fiziksel evrak teslimine göre yürütülmelidir.
