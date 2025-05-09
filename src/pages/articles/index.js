import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Head from 'next/head';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ArticlesList() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            console.log(`${process.env.NEXT_PUBLIC_API_URL}/api/articles`);
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/articles`);
            
            // Tüm makaleleri al ve sırala (yayında olanlar en üstte)
            const allArticles = [...response.data];
            
            // İlk önce yayında olan / olmayan olarak ayır, sonra tarih sıralaması yap
            allArticles.sort((a, b) => {
                // Önce yayında olanları en üste getir
                const aIsPublished = isPublished(a);
                const bIsPublished = isPublished(b);
                
                if (aIsPublished && !bIsPublished) return -1;
                if (!aIsPublished && bIsPublished) return 1;
                
                // İkisi de aynı durumdaysa tarihe göre sırala (en yeni en üstte)
                return new Date(b.publishAt || b.createdAt) - new Date(a.publishAt || a.createdAt);
            });
            
            setArticles(allArticles);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching articles:', error);
            setError(error.message);
            setLoading(false);
        }
    };
    
    // Makalenin yayında olup olmadığını kontrol eden yardımcı fonksiyon
    const isPublished = (article) => {
        // Eğer taslak ise yayınlanmamış
        if (article.status === "draft") return false;
        
        // Eğer zamanlı ise ve tarih gelmediyse yayınlanmamış
        if (article.status === "scheduled" && new Date(article.publishAt) > new Date()) return false;
        
        // Eğer publishAt varsa ve gelecek bir tarihse yayınlanmamış
        if (article.publishAt && new Date(article.publishAt) > new Date()) return false;
        
        // Diğer tüm durumlar için yayında kabul et
        return true;
    };

    // Yayınlanma durumuna göre görsel stil belirleyen fonksiyon
    const getArticleStyle = (article) => {
        const baseStyle = { 
            marginBottom: '25px', 
            padding: '15px', 
            borderBottom: '1px solid #eaeaea',
            borderRadius: '4px'
        };
        
        // Yayında değilse soluk göster
        if (!isPublished(article)) {
            return {
                ...baseStyle,
                opacity: 0.6,
                backgroundColor: '#f9f9f9',
                border: '1px dashed #ddd'
            };
        }
        
        return baseStyle;
    };
    
    // Makalenin durumunu gösteren rozet (badge) bileşeni
    const StatusBadge = ({ article }) => {
        let badgeStyle = {
            display: 'inline-block',
            padding: '3px 8px',
            borderRadius: '3px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginLeft: '10px',
            color: 'white'
        };
        
        if (article.status === "draft") {
            return (
                <span style={{...badgeStyle, backgroundColor: '#aaa'}}>
                    Taslak
                </span>
            );
        } else if (article.status === "scheduled") {
            return (
                <span style={{...badgeStyle, backgroundColor: '#f0ad4e'}}>
                    Zamanlandı
                </span>
            );
        } else if (isPublished(article)) {
            return (
                <span style={{...badgeStyle, backgroundColor: '#5cb85c'}}>
                    Yayında
                </span>
            );
        }
        
        return null;
    };

    if (loading) {
        return <div>Yükleniyor...</div>;
    }

    if (error) {
        return (
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", textAlign: "center" }}>
                <h1>Bir hata oluştu</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            <Head>
                <title>Tüm Haberler</title>
            </Head>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Haberler</h1>
                <Link href="/create" style={{ 
                    backgroundColor: '#0070f3', 
                    color: 'white', 
                    padding: '8px 16px', 
                    borderRadius: '4px',
                    textDecoration: 'none'
                }}>
                    Yeni Haber Oluştur
                </Link>
            </div>
            
            {articles.length === 0 ? (
                <p>Henüz haber bulunmuyor.</p>
            ) : (
                <div>
                    {articles.map(article => (
                        <div key={article.id} style={getArticleStyle(article)}>
                            <h2 style={{ marginBottom: '8px' }}>
                                <Link href={`/articles/${article.slug}`} style={{ color: '#0070f3' }}>
                                    {article.title}
                                </Link>
                                <StatusBadge article={article} />
                            </h2>
                            
                            <div style={{ color: '#666', marginBottom: '10px', fontSize: '14px' }}>
                                <span>{article.category}</span>
                                <span style={{ margin: '0 10px' }}>|</span>
                                <span>
                                    {article.scheduledAt && format(new Date(article.scheduledAt), 'd MMMM yyyy HH:mm', { locale: tr })}
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <Link href={`/edit/${article.id}`} style={{ 
                                    backgroundColor: '#f0f0f0', 
                                    padding: '5px 10px', 
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}>
                                    Düzenle
                                </Link>
                                <button onClick={() => handleDelete(article.id)} style={{ 
                                    backgroundColor: '#ff4d4f', 
                                    color: 'white',
                                    padding: '5px 10px', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}>
                                    Sil
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Durum açıklaması */}
            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Haber Durumları:</p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ 
                            display: 'inline-block', 
                            padding: '3px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: '#5cb85c',
                            marginRight: '5px'
                        }}>Yayında</span>
                        <span>Şu an aktif olarak yayında olan haberler</span>
                    </div>
                    <div>
                        <span style={{ 
                            display: 'inline-block', 
                            padding: '3px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: '#f0ad4e',
                            marginRight: '5px'
                        }}>Zamanlandı</span>
                        <span>İleri bir tarihte yayınlanacak haberler</span>
                    </div>
                    <div>
                        <span style={{ 
                            display: 'inline-block', 
                            padding: '3px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: '#aaa',
                            marginRight: '5px'
                        }}>Taslak</span>
                        <span>Henüz yayınlanmamış taslak haberler</span>
                    </div>
                </div>
            </div>
        </div>
    );
    
    async function handleDelete(id) {
        if (window.confirm('Bu haberi silmek istediğinize emin misiniz?')) {
            try {
                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}`);
                // Silinen haberi listeden kaldır
                setArticles(articles.filter(article => article.id !== id));
                alert('Haber başarıyla silindi');
            } catch (error) {
                console.error('Error deleting article:', error);
                alert('Haber silinirken bir hata oluştu');
            }
        }
    }
}

export async function getServerSideProps() {
    return {
        props: {
            title: "Haberler - Simple News"
        }
    };
}