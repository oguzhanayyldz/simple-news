import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useRouter } from 'next/router';
import useAnonymousId from '@/hooks/useAnonymousId';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function CreateNews() {
    const router = useRouter();
    const { anonymousId, username } = useAnonymousId();
    const [articleId, setArticleId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const saveTimeoutRef = useRef(null);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [attachments, setAttachments] = useState([]); // Eklenen medya dosyalarını takip etmek için
    
    const [form, setForm] = useState({
        title: '',
        slug: '',
        category: '',
        content: '',
        tags: '',
        scheduledAt: null,
        relatedArticles: [],
        attachments: []
    });

    // Form alanları dolu mu kontrol et
    const isFormValid = () => {
        return form.title.trim() !== '' && form.content.trim() !== '';
    };

    // Medya yükleme butonu aktif olması için gereken koşullar
    const canUploadMedia = () => {
        return isFormValid() || articleId !== null;
    };

    // Slug oluşturma yardımcı fonksiyonu
    const generateSlugFromTitle = (title) => {
        return title
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '') // Alfanümerik olmayan karakterleri temizle
            .replace(/\s+/g, '-') // Boşlukları tire ile değiştir
            .replace(/-+/g, '-') // Birden fazla tireyi tek tireye dönüştür
            .trim('-'); // Baştaki ve sondaki tireleri kaldır
    };

    // Başlık değiştiğinde otomatik olarak slug oluştur
    const handleTitleChange = (e) => {
        const title = e.target.value;
        setForm(prev => ({
            ...prev,
            title,
            // Eğer kullanıcı slug'ı manuel olarak değiştirmediyse otomatik oluştur
            slug: prev.slug === generateSlugFromTitle(prev.title) || prev.slug === '' ? 
                generateSlugFromTitle(title) : prev.slug
        }));
        triggerAutoSave();
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        triggerAutoSave();
    };

    const handleContentChange = (value) => {
        setForm({ ...form, content: value });
        triggerAutoSave();
    };

    const triggerAutoSave = () => {
        // Geçerli değilse otomatik kaydetme
        if (!isFormValid()) return;
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            saveArticle();
        }, 3000); // 3 saniye debounce
    };
    
    const saveArticle = async () => {
        // Form geçerli değilse kaydetme
        if (!isFormValid()) return;
        
        try {
            setIsSaving(true);
            
            if (articleId) {
                // Güncelleme yap
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}`, form);
            } else {
                // Yeni haber oluştur
                const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/articles`, {
                    ...form
                });
                setArticleId(response.data.id);
            }
            
            setLastSaved(new Date());
            setIsSaving(false);
        } catch (error) {
            console.error('Kayıt sırasında hata:', error);
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isFormValid()) {
            alert('Lütfen başlık ve içerik alanlarını doldurun.');
            return;
        }
        
        await saveArticle();
        
        if (articleId) {
            try {
                // Taslak durumunu güncelle
                if (form.scheduledAt && new Date(form.scheduledAt) > new Date()) {
                    // İleri tarihli ise zamanlanmış olarak ayarla
                    await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}`, {
                        ...form
                    });
                    alert('Haber kaydedildi! Belirtilen tarihte yayınlanacak.');
                } else {
                    // Hemen yayınla
                    await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/publish`, { userId: anonymousId });
                    alert('Haber oluşturuldu ve yayınlandı!');
                }
                
                // Oturumu sonlandır
                await endEditingSession();
                router.push('/articles');
            } catch (error) {
                console.error('Yayınlama hatası:', error);
                alert('Haber oluşturuldu ancak yayınlanırken bir hata oluştu.');
            }
        } else {
            alert('Haber oluşturulamadı. Lütfen tekrar deneyin.');
        }
    };

    // Editing session'ı sonlandır
    const endEditingSession = async () => {
        if (articleId) {
            try {
                await axios.delete(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/editing-session`,
                    { data: { userId: anonymousId } }
                );
            } catch (error) {
                console.error('Error ending editing session:', error);
            }
        }
    };

    // Setup editing session
    useEffect(() => {
        if (articleId) {
            // session başlat
            const startSession = async () => {
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/editing-session`,
                    { userId: anonymousId, username: username }
                );
            };
            
            startSession();
            
            // Kullanıcı 10 saniyede bir aktif mi kontrol et
            const heartbeatInterval = setInterval(async () => {
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/editing-session`,
                    { userId: anonymousId, username: username }
                );
            }, 10000); // 10 saniye
            
            // Sayfadan ayrılırken interval temizleme ve session sonlandırma
            return () => {
                clearInterval(heartbeatInterval);
                endEditingSession();
            };
        }
    }, [articleId, anonymousId, username]);

    // Sayfadan ayrılma durumunda tarayıcı uyarısı
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isFormValid() && !lastSaved) {
                // Kaydedilmemiş değişiklikler varsa
                e.preventDefault();
                e.returnValue = 'Kaydedilmemiş değişiklikleriniz var, çıkmak istediğinize emin misiniz?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [form, lastSaved]);

    // Medya yükleme fonksiyonu
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Henüz ID yoksa, önce haber taslağını oluştur
        if (!articleId) {
            if (!isFormValid()) {
                alert('Lütfen önce başlık ve içerik alanlarını doldurun.');
                return;
            }
            
            // Taslak olarak kaydet ve ID al
            await saveArticle();
            
            if (!articleId) {
                alert('Medya yükleyebilmek için önce haberin kaydedilmesi gerekiyor. Lütfen tekrar deneyin.');
                return;
            }
        }
        
        setMediaUploading(true);
        
        // Dosyayı yükle
        try {
            // articleId'yi kullanarak attachment endpoint'ine yükle
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/attachments`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            // Makaleyi yenileyerek güncel attachments listesini al
            const articleResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}`);
            
            // Form state'ini güncelle
            setForm(prev => ({
                ...prev,
                attachments: articleResponse.data.attachments || []
            }));
            
            // Attachment listesini güncelle
            setAttachments(articleResponse.data.attachments || []);
            
            // Başarılı mesajı göster
            alert('Medya başarıyla yüklendi!');
            
        } catch (error) {
            console.error('Medya yükleme hatası:', error);
            alert('Medya yüklenemedi: ' + (error.response?.data?.message || error.message));
        } finally {
            setMediaUploading(false);
        }
    };

    // Eklenen medya dosyasını silme
    const handleDeleteAttachment = async (attachmentIndex) => {
        if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) {
            return;
        }
        
        try {
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/attachments/${attachmentIndex}`
            );
            
            // Makaleyi yenileyerek güncel attachments listesini al
            const articleResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}`);
            
            // Form state'ini güncelle
            setForm(prev => ({
                ...prev,
                attachments: articleResponse.data.attachments || []
            }));
            
            // Attachment listesini güncelle
            setAttachments(articleResponse.data.attachments || []);
            
            alert('Dosya başarıyla silindi.');
        } catch (error) {
            console.error('Dosya silme hatası:', error);
            alert('Dosya silinirken bir hata oluştu.');
        }
    };

    // Dosya boyutunu formatlamak için helper fonksiyon
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            <form onSubmit={handleSubmit}>
                <h1>Yeni Haber Oluştur</h1>
                
                <div style={{ color: isSaving ? 'orange' : 'green', marginBottom: '10px' }}>
                    {isSaving ? 'Kaydediliyor...' : 
                     lastSaved ? `Son kaydedilme: ${lastSaved.toLocaleTimeString()}` : 
                     'Henüz kaydedilmedi'}
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>Başlık: <span style={{ color: 'red' }}>*</span></label>
                    <input
                        name="title"
                        placeholder="Başlık (zorunlu)"
                        value={form.title}
                        onChange={handleTitleChange}
                        style={{ 
                            width: '100%', 
                            padding: '8px',
                            borderColor: form.title.trim() === '' ? '#ff6b6b' : '#ddd'
                        }}
                        required
                    />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>Slug:</label>
                    <input
                        name="slug"
                        placeholder="Slug (otomatik oluşturulur)"
                        value={form.slug}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>Kategori:</label>
                    <input
                        name="category"
                        placeholder="Kategori"
                        value={form.category}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>Etiketler (virgülle ayırın):</label>
                    <input
                        name="tags"
                        placeholder="Etiket1, Etiket2, ..."
                        value={form.tags}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>Yayınlanma Tarihi:</label>
                    <input
                        type="datetime-local"
                        name="scheduledAt"
                        value={form.scheduledAt}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>İçerik: <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ height: '300px', marginBottom: '15px' }}>
                        <ReactQuill 
                            value={form.content} 
                            onChange={handleContentChange} 
                            style={{ height: '250px' }}
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                    ['link', 'image'],
                                    ['clean']
                                ]
                            }}
                        />
                    </div>
                    {form.content.trim() === '' && (
                        <div style={{ color: '#ff6b6b', fontSize: '14px', marginTop: '-10px' }}>
                            İçerik zorunludur
                        </div>
                    )}
                </div>
                
                {/* Ekli medya dosyaları listesi */}
                {form.attachments && form.attachments.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <label>Ekli Dosyalar:</label>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '15px',
                            marginTop: '10px',
                            border: '1px solid #eaeaea',
                            borderRadius: '4px',
                            padding: '15px'
                        }}>
                            {form.attachments.map((attachment, index) => (
                                <div key={index} style={{
                                    position: 'relative',
                                    width: '150px',
                                    marginBottom: '10px'
                                }}>
                                    {/* Resim ise küçük önizleme göster */}
                                    {attachment.type && attachment.type.startsWith('image/') ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL}${attachment.path}`}
                                            alt={attachment.name}
                                            style={{
                                                width: '100%',
                                                height: '100px',
                                                objectFit: 'cover',
                                                borderRadius: '4px'
                                            }}
                                            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${attachment.path}`, '_blank')}
                                        />
                                    ) : (
                                        // Resim değilse dosya ikonu
                                        <div style={{
                                            width: '100%',
                                            height: '100px',
                                            backgroundColor: '#f5f5f5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${attachment.path}`, '_blank')}
                                        >
                                            <span style={{ textAlign: 'center' }}>📄</span>
                                        </div>
                                    )}

                                    {/* Dosya adı */}
                                    <div style={{
                                        fontSize: '12px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginTop: '5px'
                                    }}>
                                        {attachment.name}
                                    </div>

                                    {/* Boyut bilgisi */}
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                        {formatFileSize(attachment.size)}
                                    </div>

                                    {/* Silme butonu */}
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteAttachment(index)}
                                        style={{
                                            position: 'absolute',
                                            top: '0',
                                            right: '0',
                                            width: '24px',
                                            height: '24px',
                                            background: 'rgba(255, 0, 0, 0.7)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div style={{ marginBottom: '30px' }}>
                    <button 
                        type="button" 
                        onClick={() => document.getElementById('media-upload').click()}
                        style={{ 
                            marginRight: '10px', 
                            padding: '8px 15px',
                            backgroundColor: canUploadMedia() ? '#0070f3' : '#ccc',
                            color: 'white',
                            cursor: canUploadMedia() ? 'pointer' : 'not-allowed'
                        }}
                        disabled={!canUploadMedia() || mediaUploading}
                    >
                        {mediaUploading ? 'Yükleniyor...' : 'Medya Yükle'}
                    </button>
                    <input 
                        id="media-upload" 
                        type="file" 
                        style={{ display: 'none' }} 
                        onChange={handleFileUpload} 
                        disabled={!canUploadMedia() || mediaUploading}
                    />
                    
                    <button 
                        type="submit" 
                        style={{ 
                            backgroundColor: isFormValid() ? '#0070f3' : '#ccc', 
                            color: 'white', 
                            padding: '10px 20px', 
                            border: 'none',
                            cursor: isFormValid() ? 'pointer' : 'not-allowed'
                        }}
                        disabled={!isFormValid() || isSaving}
                    >
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet ve Yayınla'}
                    </button>
                </div>
                
                {/* Zorunlu alanlar için bilgilendirme */}
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                    <span style={{ color: 'red' }}>*</span> işaretli alanlar zorunludur.
                </div>
                
                {/* Form durumu mesajı */}
                {!isFormValid() && (
                    <div style={{ 
                        backgroundColor: '#fff3cd', 
                        color: '#856404', 
                        padding: '10px 15px', 
                        borderRadius: '4px', 
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        <strong>Bilgi:</strong> Medya yüklemek ve haberi kaydetmek için başlık ve içerik alanlarını doldurmalısınız.
                    </div>
                )}
            </form>
        </div>
    );
}

export async function getServerSideProps() {
    return {
        props: {
            title: "Yeni Haber Oluştur - Simple News"
        }
    };
}