import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// initialNews ve initialError props'unu alıyoruz
export default function ArticleDetail({ initialNews, initialError, title }) {
    const router = useRouter();
    const { slug } = router.query;

    // Server-side props'tan gelen veriyi kullanıyoruz
    const [article, setArticle] = useState(initialNews);
    const [loading, setLoading] = useState(!initialNews && !initialError);
    const [error, setError] = useState(initialError);
    const [relatedArticles, setRelatedArticles] = useState([]);

    useEffect(() => {
        // Server-side props ile veri geldiyse, ilişkili haberleri getir
        if (article && article.relatedArticles && article.relatedArticles.length > 0) {
            fetchRelatedArticles(article.relatedArticles);
        }
    }, [article]);

    // Makalenin yayında olup olmadığını kontrol eden yardımcı fonksiyon
    const checkIfPublished = (article) => {
        // Eğer taslak ise yayınlanmamış
        if (article.status === "draft") return false;

        // Eğer zamanlı ise ve tarih gelmediyse yayınlanmamış
        if (article.status === "scheduled" && new Date(article.scheduledAt) > new Date()) return false;

        // Eğer scheduledAt varsa ve gelecek bir tarihse yayınlanmamış
        if (article.scheduledAt && new Date(article.scheduledAt) > new Date()) return false;

        // Diğer tüm durumlar için yayında kabul et
        return true;
    };

    const fetchRelatedArticles = async (relatedIds) => {
        try {
            const promises = relatedIds.map(id =>
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}`)
            );

            const responses = await Promise.all(promises);
            const articles = responses.map(res => res.data);

            // Yayında olan ilişkili haberleri filtrele
            const publishedRelatedArticles = articles.filter(article => checkIfPublished(article));

            setRelatedArticles(publishedRelatedArticles);
        } catch (error) {
            console.error('Error fetching related articles:', error);
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

    if (loading) {
        return <div>Yükleniyor...</div>;
    }

    if (error) {
        return (
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", textAlign: "center" }}>
                {error.status === 'future' && (
                    <>
                        <h1>Bu haber henüz yayında değil</h1>
                        <p>Yayınlanma tarihi: {error.date && format(new Date(error.date), 'PPP', { locale: tr })}</p>
                    </>
                )}

                {error.status === 'draft' && (
                    <>
                        <h1>Bu haber henüz yayınlanmadı</h1>
                        <p>Bu içerik taslak halinde ve henüz yayına alınmamıştır.</p>
                    </>
                )}

                {error.status === 'not-found' && (
                    <h1>Haber bulunamadı</h1>
                )}

                {error.status === 'error' && (
                    <>
                        <h1>Bir hata oluştu</h1>
                        <p>{error.message}</p>
                    </>
                )}

                <p><Link href="/articles">Haberlere dön</Link></p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            <Head>
                <title>{article.title}</title>
                <meta name="description" content={article.content.substring(0, 160)} />
            </Head>

            <div style={{ marginBottom: '20px' }}>
                <Link href="/articles">&larr; Tüm Haberler</Link>
            </div>

            <article>
                <h1 style={{ marginBottom: '10px' }}>{article.title}</h1>

                <div style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                    <span>Kategori: {article.category}</span>
                    <span style={{ margin: '0 10px' }}>|</span>
                    <span>
                        {article.scheduledAt && format(new Date(article.scheduledAt), 'd MMMM yyyy HH:mm', { locale: tr })}
                    </span>

                    {article.tags && (
                        <>
                            <span style={{ margin: '0 10px' }}>|</span>
                            <span>
                                Etiketler: {article.tags}
                            </span>
                        </>
                    )}
                </div>

                <div
                    className="article-content"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                    style={{ lineHeight: '1.6' }}
                />

                {/* Attachments / Dosya Ekleri */}
                {article.attachments && article.attachments.length > 0 && (
                    <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                        <h3 style={{ marginBottom: '15px' }}>Ekli Dosyalar</h3>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '15px'
                        }}>
                            {article.attachments.map((attachment, index) => (
                                <div key={index} style={{
                                    width: '150px',
                                    marginBottom: '15px',
                                    textAlign: 'center'
                                }}>
                                    {/* Resim ise önizleme göster, değilse dosya ikonu */}
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_API_URL}${attachment.path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        {attachment.type && attachment.type.startsWith('image/') ? (
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL}${attachment.path}`}
                                                alt={attachment.name || `Ek ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100px',
                                                    objectFit: 'cover',
                                                    borderRadius: '4px',
                                                    marginBottom: '8px',
                                                    border: '1px solid #eaeaea'
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%',
                                                height: '100px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                                marginBottom: '8px',
                                                fontSize: '36px'
                                            }}>
                                                {attachment.type && attachment.type.startsWith('video/') ? '🎬' :
                                                    attachment.type && attachment.type.startsWith('audio/') ? '🎵' :
                                                        attachment.type && attachment.type.startsWith('application/pdf') ? '📄' :
                                                            '📎'}
                                            </div>
                                        )}

                                        <div style={{
                                            fontSize: '14px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginBottom: '4px'
                                        }}>
                                            {attachment.name || `Dosya ${index + 1}`}
                                        </div>

                                        {attachment.size && (
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                {formatFileSize(attachment.size)}
                                            </div>
                                        )}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* İlişkili Haberler */}
                {relatedArticles.length > 0 && (
                    <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                        <h3 style={{ marginBottom: '15px' }}>İlişkili Haberler</h3>
                        <ul style={{ paddingLeft: '20px' }}>
                            {relatedArticles.map(related => (
                                <li key={related.id} style={{ marginBottom: '8px' }}>
                                    <Link href={`/articles/${related.slug}`}>
                                        {related.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </article>
        </div>
    );
}

// Server-side data fetching
export async function getServerSideProps(context) {
    const { slug } = context.params;
    let title = "Haber - Simple News";
    let initialNews = null;
    let initialError = null;

    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;

        // Haberi getir
        const response = await axios.get(`${API_URL}/api/articles?slug=${slug}`);
        const article = await response.data;

        if (!article) {
            return {
                props: {
                    initialError: {
                        status: 'not-found',
                        message: 'Haber bulunamadı'
                    },
                    title: "Haber Bulunamadı - Simple News"
                }
            };
        }

        // Status ve tarih kontrolü
        const isPublished = checkPublishStatus(article);

        if (!isPublished) {
            // Yayında olmayan haber
            if (article.status === "draft") {
                initialError = { status: 'draft' };
                title = "Taslak Haber - Simple News";
            } else if (article.status === "scheduled" || article.scheduledAt) {
                // Gelecekte yayınlanacak
                // Date nesnesini doğrudan göndermek yerine ISO string olarak gönderiyoruz
                const publishDate = article.scheduledAt ? new Date(article.scheduledAt).toISOString() : null;
                initialError = {
                    status: 'future',
                    date: publishDate // Artık bir string (ISO formatında)
                };
                title = "Zamanlanmış Haber - Simple News";
            }
        } else {
            // Haber yayında, gösterebiliriz
            initialNews = article;
            title = `${article.title} - Simple News`;
        }
    } catch (error) {
        console.error('Error in getServerSideProps:', error);
        initialError = {
            status: 'error',
            message: error.message || 'Bir hata oluştu'
        };
        title = "Haber Yüklenemedi - Simple News";
    }

    return {
        props: {
            initialNews,
            initialError,
            title
        }
    };

    // Yayın durumunu kontrol eden yardımcı fonksiyon
    function checkPublishStatus(article) {
        if (!article) return false;

        // Taslak durumunda mı?
        if (article.status === "draft") return false;

        // Zamanlanmış ve tarihi gelmemiş mi?
        if (article.status === "scheduled" && new Date(article.scheduledAt) > new Date())
            return false;

        // Gelecek tarihli mi?
        if (article.scheduledAt && new Date(article.scheduledAt) > new Date())
            return false;

        return true;
    }
}