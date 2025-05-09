import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import axios from 'axios';
import Select from 'react-select';
import useAnonymousId from '@/hooks/useAnonymousId';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { utcToLocal } from '@/hooks/useDateTime';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function EditNews() {
    const router = useRouter();
    const { id } = router.query;
    const { anonymousId, username } = useAnonymousId();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [articles, setArticles] = useState([]);
    const [currentEditor, setCurrentEditor] = useState(null);
    const saveTimeoutRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const lastActivityRef = useRef(new Date());
    const [isDirty, setIsDirty] = useState(false);
    const [originalForm, setOriginalForm] = useState(null);
    const [queuedEditors, setQueuedEditors] = useState([]); // Sırada bekleyen editörler için yeni state

    const [form, setForm] = useState({
        title: '',
        slug: '',
        category: '',
        content: '',
        tags: '',
        scheduledAt: '',
        relatedArticles: [],
        attachments: []
    });

    // Fetch article data
    useEffect(() => {
        if (id && anonymousId) {
            fetchArticle();
            fetchAllArticles();
            checkEditingSession();

            // Setup heartbeat
            const heartbeatInterval = setInterval(() => {
                sendHeartbeat();
            }, 10000);

            // Setup inactivity check (120 saniye = 2 dakika)
            setupInactivityCheck(120);

            // Clear editing session when leaving
            return () => {
                clearInterval(heartbeatInterval);
                if (inactivityTimerRef.current) {
                    clearInterval(inactivityTimerRef.current);
                }
                endEditingSession();
            };
        }
    }, [id, anonymousId]);

    useEffect(() => {
        const handleBeforeUnload = async (e) => {
            // Tarayıcı standart uyarısını göstermek için
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'Kaydedilmemiş değişiklikleriniz var, çıkmak istediğinize emin misiniz?';
            }

            // Oturumu sonlandır
            await endEditingSession();

            // Dirty bir form varsa otomatik kaydet
            if (isDirty) {
                await saveArticle();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, anonymousId]);

    // Aktivite takibi için kullanıcı hareketlerini dinle
    useEffect(() => {
        // Kullanıcı aktivitesini izle
        const handleUserActivity = () => {
            lastActivityRef.current = new Date();
        };

        // Çeşitli kullanıcı hareketlerini dinle
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('click', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        return () => {
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
        };
    }, []);

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

    // Hareketsizlik kontrolü için timer oluştur
    const setupInactivityCheck = (seconds) => {
        if (inactivityTimerRef.current) {
            clearInterval(inactivityTimerRef.current);
        }

        inactivityTimerRef.current = setInterval(() => {
            const now = new Date();
            const timeSinceLastActivity = (now - lastActivityRef.current) / 1000;

            if (timeSinceLastActivity >= seconds) {
                console.log(`${seconds} saniye boyunca hareketsiz kaldınız.`);
                handleInactivity();
            }
        }, 10000); // 10 saniyede bir kontrol et
    };

    // Hareketsizlik durumunda yapılacak işlemler
    const handleInactivity = async () => {
        console.log("Uzun süredir hareketsiz kalındığı için oturum sonlandırılıyor...");

        if (isDirty) {
            // Değişiklik varsa son kez kaydet
            await saveArticle();
        }

        // Oturumu sonlandır
        await endEditingSession();

        // Interval'i temizle
        if (inactivityTimerRef.current) {
            clearInterval(inactivityTimerRef.current);
        }

        // Kullanıcıyı yönlendir
        alert("Uzun süre hareketsiz kaldığınız için düzenleme oturumunuz sonlandırıldı.");
        router.push('/articles');
    };

    const fetchArticle = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}`);
            const article = response.data;

            // Format dates for input[type=datetime-local]
            if (article.scheduledAt) {
                const date = utcToLocal(new Date(article.scheduledAt));
                article.scheduledAt = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
            }

            // Eğer attachments yoksa boş dizi olarak ayarla
            if (!article.attachments) {
                article.attachments = [];
            }

            setForm(article);
            setOriginalForm(JSON.parse(JSON.stringify(article))); // Deep copy for comparison
            setLoading(false);
        } catch (error) {
            console.error('Error fetching article:', error);
            alert('Haber yüklenemedi!');
            router.push('/articles');
        }
    };

    const fetchAllArticles = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/articles`);
            // Filter out current article
            const filteredArticles = response.data.filter(article => article.id !== id);
            setArticles(filteredArticles.map(article => ({
                value: article.id,
                label: article.title
            })));
        } catch (error) {
            console.error('Error fetching articles for related selection:', error);
        }
    };

    const checkEditingSession = async () => {
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}/editing-session`,
                { userId: anonymousId, username: username }
            );
            console.log('Editing session response:', response.data);
            console.log('Current user ID:', anonymousId);

            if (response.data.activeSessions && response.data.activeSessions.length > 0) {
                // Tüm aktif oturumları al ve tarihlerine göre sırala
                const allSessions = [...response.data.activeSessions];

                // Tarihe göre sırala (en eski en başta)
                allSessions.sort((a, b) => {
                    return new Date(a.lastActivity) - new Date(b.lastActivity);
                });

                // Bizim oturumumuzu bul
                const userSessionIndex = allSessions.findIndex(session => session.userId === anonymousId);
                const isUserActive = userSessionIndex >= 0;

                // İlk oturum (aktif editör)
                const activeEditor = allSessions.length > 0 ? allSessions[0] : null;

                // Kullanıcı aktif editör mü kontrol et
                if (isUserActive && userSessionIndex === 0) {
                    console.log("Kullanıcı aktif editör");
                    if (currentEditor) {
                        await fetchArticle();
                    }
                    setCurrentEditor(null);

                    // Sıradaki editörleri ayarla (kendimizi çıkar)
                    setQueuedEditors(allSessions.slice(1));
                } else {
                    // Başka bir editör aktif
                    if (!currentEditor || currentEditor.userId !== activeEditor.userId) {
                        console.log("Başka bir editör tespit edildi, haberin son hali yükleniyor...");
                        await fetchArticle(); // Haberin en son halini tekrar yükle
                    }

                    // Aktif editörü ayarla
                    setCurrentEditor(activeEditor);

                    // Sıradaki editörleri ayarla
                    const otherEditors = allSessions.slice(1); // İlk editör hariç diğerleri
                    setQueuedEditors(otherEditors);
                }
            } else {
                // Hiç aktif oturum yoksa, kendi oturumumuzu başlatalım
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}/editing-session`,
                    { userId: anonymousId, username: username }
                );

                // Current editor'ü ve sıradaki editörleri temizle
                setCurrentEditor(null);
                setQueuedEditors([]);
            }
        } catch (error) {
            console.error('Error checking editing session:', error);
        }
    };

    const sendHeartbeat = async () => {
        if (!currentEditor) {
            try {
                await checkEditingSession();
                // Son aktivite zamanını güncelle
                lastActivityRef.current = new Date();
            } catch (error) {
                console.error('Error sending heartbeat:', error);
            }
        }
    };

    const endEditingSession = async () => {
        try {
            console.log("Editing session sonlandırılıyor, userId:", anonymousId);
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}/editing-session`,
                {
                    data: {
                        userId: anonymousId
                    }
                }
            );
        } catch (error) {
            console.error('Error ending editing session:', error);
        }
    };

    // Form değişikliği için dirty flag ayarla
    const checkFormChanged = (updatedForm) => {
        if (!originalForm) return false;

        // Basit karşılaştırma (derin karşılaştırma için lodash gibi bir kütüphane kullanılabilir)
        const isDifferent =
            originalForm.title !== updatedForm.title ||
            originalForm.slug !== updatedForm.slug ||
            originalForm.category !== updatedForm.category ||
            originalForm.content !== updatedForm.content ||
            originalForm.tags !== updatedForm.tags ||
            originalForm.scheduledAt !== updatedForm.scheduledAt ||
            JSON.stringify(originalForm.relatedArticles) !== JSON.stringify(updatedForm.relatedArticles);

        setIsDirty(isDifferent);
        return isDifferent;
    };

    const handleChange = (e) => {
        let updatedForm = { ...form };
        if (e.target.name !== 'title') {
            updatedForm = { ...form, [e.target.name]: e.target.value };
            setForm(updatedForm);
        } else {
            updatedForm = { ...form, title: e.target.value, slug: generateSlugFromTitle(e.target.value) };
            setForm(updatedForm);
        }

        // Değişiklik olup olmadığını kontrol et
        if (checkFormChanged(updatedForm)) {
            triggerAutoSave();
        }

        // Aktivite zamanını güncelle
        lastActivityRef.current = new Date();
    };

    const handleContentChange = (value) => {
        const updatedForm = { ...form, content: value };
        setForm(updatedForm);

        // Değişiklik olup olmadığını kontrol et
        if (checkFormChanged(updatedForm)) {
            triggerAutoSave();
        }

        // Aktivite zamanını güncelle
        lastActivityRef.current = new Date();
    };

    const handleRelatedArticlesChange = (selectedOptions) => {
        const relatedArticles = selectedOptions.map(option => option.value);
        const updatedForm = { ...form, relatedArticles };
        setForm(updatedForm);

        // Değişiklik olup olmadığını kontrol et
        if (checkFormChanged(updatedForm)) {
            triggerAutoSave();
        }

        // Aktivite zamanını güncelle
        lastActivityRef.current = new Date();
    };

    const triggerAutoSave = () => {
        // Form dirty değilse kaydetmiyoruz
        if (!isDirty) {
            console.log("Değişiklik olmadığı için otomatik kaydetme atlanıyor");
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveArticle();
        }, 3000); // 3 saniye debounce
    };

    const saveArticle = async () => {
        // Başka editör varsa veya değişiklik yoksa kaydetme
        if (currentEditor || !isDirty) return;

        try {
            setIsSaving(true);
            console.log("Makale kaydediliyor...");

            // Formu ekli dosyalarla birlikte gönder
            const formData = {
                ...form,
                attachments: form.attachments || [], // Eğer undefined ise boş dizi olarak gönder
                scheduledAt: (form.scheduledAt && new Date(form.scheduledAt) <= new Date()) ? new Date().toISOString() : (form.scheduledAt || new Date().toISOString()),
            };

            const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}`, formData);

            setLastSaved(new Date());
            // Kayıt başarılı olduğunda originalForm'u güncelle
            setOriginalForm(JSON.parse(JSON.stringify(form)));
            setIsDirty(false);
            setIsSaving(false);
        } catch (error) {
            console.error('Error saving article:', error);
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Aktivite zamanını güncelle
        lastActivityRef.current = new Date();

        if (currentEditor) {
            alert('Bu haberi şu an başka bir editör düzenliyor. Değişiklikleriniz kaydedilemez.');
            return;
        }

        // Değişiklik yoksa kaydetmeye gerek yok
        if (!isDirty) {
            alert('Herhangi bir değişiklik yapmadınız.');
            return;
        }

        await saveArticle();

        if (form.scheduledAt && new Date(form.scheduledAt) <= new Date()) {
            // Eğer tarih geçmişte ise hemen yayınla
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}/publish`, { userId: anonymousId });
            alert('Haber güncellendi ve yayınlandı!');
        } else {
            alert('Haber güncellendi! Belirtilen tarihte yayınlanacak.');
        }

        // Oturumu sonlandır ve sayfadan ayrıl
        await endEditingSession();
        router.push('/articles');
    };

    // Bekleme süresini hesaplama yardımcı fonksiyonu
    const calculateWaitingTime = (startTime) => {
        if (!startTime) return 'Bilinmiyor';

        try {
            const date = new Date(startTime);
            return formatDistanceToNow(date, {
                addSuffix: true,
                locale: tr
            });
        } catch (error) {
            console.error('Date calculation error:', error);
            return 'Bilinmiyor';
        }
    };

    const uploadFile = async (articleId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}/attachments`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Dosya yükleme hatası');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Dosya yükleme hatası:', error);
            throw error;
        }
    };

    // Kullanım örneği:
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const uploadedFile = await uploadFile(id, file);
                console.log('Dosya yüklendi:', uploadedFile);
                // State'i güncelle veya dosyayı ekranda göster
                fetchArticle();
            } catch (error) {
                console.error('Yükleme hatası:', error);
            }
        }
    };

    // Yüklü medya dosyalarını silme işlemi
    const handleDeleteAttachment = async (attachmentIndex) => {
        if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}/attachments/${attachmentIndex}`
            );

            // Başarıyla silindiyse formdaki attachments listesini güncelle
            await fetchArticle(); // Makaleyi tekrar yükleyerek güncel attachments listesini al

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

    // JSX render kısmı buraya gelecek
    if (loading) {
        return <div>Yükleniyor...</div>;
    }

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            {currentEditor && (
                <div style={{
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    padding: '10px',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <strong>⚠️ Uyarı:</strong> Bu haberi şu an {currentEditor.username || currentEditor.userId} düzenliyor.
                    <div style={{ fontSize: '14px', marginTop: '5px' }}>
                        Son Aktivite: {calculateWaitingTime(currentEditor.lastActivity)}
                    </div>
                </div>
            )}

            {/* Sırada bekleyen editörler paneli */}
            {queuedEditors.length > 0 && (
                <div style={{
                    backgroundColor: '#e8f4f8',
                    padding: '10px',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <strong>📋 Düzenleme Sırası:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '25px' }}>
                        {queuedEditors.map((editor, index) => (
                            <li key={index} style={{ marginBottom: '5px' }}>
                                <span style={{ fontWeight: editor.userId === anonymousId ? 'bold' : 'normal' }}>
                                    {editor.username || editor.userId}
                                    {editor.userId === anonymousId ? ' (Siz)' : ''}
                                </span>
                                <span style={{ fontSize: '13px', color: '#666', marginLeft: '8px' }}>
                                    {calculateWaitingTime(editor.lastActivity)} son aktivitesi sırada
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <h1>Haber Düzenle</h1>

                {/* Kendi sıra durumumuzu göster */}
                {currentEditor && queuedEditors.some(e => e.userId === anonymousId) && (
                    <div style={{
                        fontSize: '14px',
                        backgroundColor: '#f0f0f0',
                        padding: '8px',
                        borderRadius: '4px',
                        marginBottom: '15px'
                    }}>
                        Sıra durumunuz: {queuedEditors.findIndex(e => e.userId === anonymousId) + 1}. sırada bekliyorsunuz.
                    </div>
                )}

                <div style={{ color: isDirty ? 'orange' : 'green', marginBottom: '10px' }}>
                    {isDirty ? 'Kaydedilmemiş değişiklikler var' : (lastSaved ? `Son kaydedilme: ${lastSaved.toLocaleTimeString()}` : 'Henüz değişiklik yapılmadı')}
                    {isSaving && ' (Kaydediliyor...)'}
                </div>

                {/* Form alanları */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Başlık:</label>
                    <input
                        name="title"
                        placeholder="Başlık"
                        value={form.title}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                        disabled={!!currentEditor}
                    />
                </div>

                {/* Diğer form alanları... */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Slug:</label>
                    <input
                        name="slug"
                        placeholder="Slug"
                        value={form.slug}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                        disabled={!!currentEditor}
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
                        disabled={!!currentEditor}
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
                        disabled={!!currentEditor}
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
                        disabled={!!currentEditor}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>İlişkili Haberler:</label>
                    <Select
                        isMulti
                        options={articles}
                        value={articles.filter(option =>
                            form.relatedArticles && form.relatedArticles.includes(option.value)
                        )}
                        onChange={handleRelatedArticlesChange}
                        placeholder="İlişkili haberleri seçin..."
                        isDisabled={!!currentEditor}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>İçerik:</label>
                    <div style={{ height: '300px', marginBottom: '15px' }}>
                        <ReactQuill
                            value={form.content}
                            onChange={handleContentChange}
                            style={{ height: '250px' }}
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['link', 'image'],
                                    ['clean']
                                ]
                            }}
                            readOnly={!!currentEditor}
                        />
                    </div>
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
                                    {attachment.type.startsWith('image/') ? (
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

                                    {/* Silme butonu - Sadece aktif kullanıcı düzenleyebilirse göster */}
                                    {!currentEditor && (
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
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '30px' }}>
                    <button
                        type="button"
                        onClick={() => document.getElementById('media-upload').click()}
                        style={{ marginRight: '10px', padding: '8px 15px' }}
                        disabled={!!currentEditor}
                    >
                        Medya Yükle
                    </button>
                    <input
                        id="media-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={!!currentEditor}
                    />

                    <button
                        type="submit"
                        style={{
                            backgroundColor: currentEditor ? '#ccc' : (isDirty ? '#0070f3' : '#aaaaaa'),
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none'
                        }}
                        disabled={!!currentEditor || !isDirty}
                    >
                        Kaydet ve Yayınla
                    </button>
                </div>
            </form>
        </div>
    );
}

export async function getServerSideProps() {
    return {
        props: {
            title: "Haber Düzenle - Simple News"
        }
    };
}