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

## İçerik

- Rol bazlı kontrol listeleri (öğrenci, bölüm sekreteri, asistan, öğretim üyesi)
- Tarih planlayıcı (15 gün ve 20 gün kritik tarih hesaplama)
- Belge kontrol matrisi (EK-1...EK-9)
- Kurum uygunluk ön karar modülü
- Başvuru takip tablosu (tarayıcı içinde saklama + CSV dışa aktarma)

## Dosyalar

- `index.html`: Giriş/bağlantı sayfası
- `ogrenci/index.html`: Öğrenci arayüzü
- `komisyon/index.html`: Komisyon arayüzü
- `styles.css`: Stil dosyası
- `app.js`: Etkileşim ve kayıt mantığı
- `docs/`: Paylaşılan PDF belgeler

## Yerel Çalıştırma

```bash
cd /Users/gurursonmez/Documents/mesleki-uygulama-rehberi
python3 -m http.server 8080
```

Sonra tarayıcıdan:
- [http://localhost:8080](http://localhost:8080)

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
