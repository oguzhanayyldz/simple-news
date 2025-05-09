# Simple News

Simple News, modern web teknolojileri kullanılarak oluşturulmuş basit bir haber yönetim ve yayınlama sistemidir.

## Özellikler

- Haber oluşturma, düzenleme ve yayınlama
- Zamanlanmış yayın özelliği
- Medya dosyaları yükleme ve yönetme
- Çoklu editör desteği ve sıra sistemi
- Otomatik kaydetme
- Kullanıcı hareketsizliği kontrolü
- İlişkili haberler
- Kategori ve etiket yönetimi
- Taslak, zamanlanmış ve yayında olan haberler için farklı görsel gösterimler

## Teknolojiler

- Next.js 15
- React 18
- Axios
- React Quill (zengin metin editörü)
- Date-fns (tarih işlemleri)
- CSS-in-JS stillemeleri

## Başlangıç


### Geliştirme Modu

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

```

### Docker ile Çalıştırma

```bash
# Bağımlılıkları yükleyin
docker-compose up

```

> **Not:** Uygulama **3001 portu** üzerinde çalışmaktadır. Tarayıcınızda [http://localhost:3001](http://localhost:3001) adresini ziyaret edin.



## 📘 Kullanım Kılavuzu

### 📰 Haber Listeleme

Ana sayfada tüm haberlerin listesini görüntüleyebilirsiniz. Haberler, yayın durumuna göre görsel olarak farklılaştırılmıştır:

- **Yayında olan haberler:** Normal görünümde
- **Zamanlanmış haberler:** Soluk ve kesikli çerçeveli
- **Taslak haberler:** Soluk ve gri arka planlı

---

### ➕ Yeni Haber Oluşturma

1. "Yeni Haber Oluştur" butonuna tıklayın  
2. Başlık ve içerik alanlarını doldurun (**zorunlu alanlar**)  
3. İsteğe bağlı olarak kategori, etiket ve yayınlanma tarihi ekleyin  
4. Medya yüklemek için önce başlık ve içerik alanlarını doldurmalısınız  
5. "Kaydet ve Yayınla" butonu ile haberi yayınlayın  

---

### ✏️ Haber Düzenleme

- Haber listesinde "Düzenle" butonuna tıklayın  
- Başka bir editör haberi düzenliyorsa, sıra sistemi devreye girer  
- Yapılan değişiklikler otomatik olarak kaydedilir  
- İşlem tamamlandığında "Kaydet ve Yayınla" butonu ile değişiklikleri uygulayın  

---

### 🔍 Haber Detayı Görüntüleme

Haber başlığına tıklayarak detay sayfasına geçebilirsiniz. Bu sayfada:

- Haberin içeriği  
- İlişkili haberler  
- Ekli medya dosyaları  

görüntülenmektedir.

---

### 🏷️ Haber Durumları

| Durum       | Açıklama                                                   |
|-------------|-------------------------------------------------------------|
| **Taslak**      | Henüz yayınlanmamış haberler                               |
| **Zamanlanmış** | İleri bir tarihte otomatik olarak yayınlanacak haberler    |
| **Yayında**     | Şu anda yayında olan ve herkes tarafından görüntülenebilen haberler |

---

## 🗂️ Proje Yapısı

- `pages/` – Next.js sayfa bileşenleri  
- `components/` – Yeniden kullanılabilir bileşenler  
- `hooks/` – Özel React hooks'ları  
- `services/` – API servisleri  
- `styles/` – CSS stilleri  

---

## ⚙️ Proje Özellikleri

### 👥 Çoklu Editör Desteği ve Sıra Sistemi

- Aynı haberi birden fazla kişi düzenlemek istediğinde, ilk giren kişi **aktif editör** olur  
- Diğer editörler sıraya alınır  
- Her editör, **sıradaki yerini** ve **bekleme süresini** görebilir  

---

### 💾 Otomatik Kaydetme

- Haber düzenleme ekranında yapılan değişiklikler, **belirli bir süre hareketsizlik** sonrası otomatik olarak kaydedilir

---

### 🖼️ Medya Yönetimi

- Habere **resim, video veya belge** eklenebilir  
- Dosyalar önizlenebilir ve silinebilir  

---

### ⏱️ Zamanlanmış Yayın

- Haberler **ileri bir tarihte** otomatik olarak yayınlanacak şekilde programlanabilir

---

## 🛡️ Lisans

Bu proje **özel kullanım** için geliştirilmiştir.