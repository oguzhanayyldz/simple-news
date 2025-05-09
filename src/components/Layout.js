import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Layout({ children, title = 'Simple News' }) {
    const router = useRouter();

    // Aktif menü öğesini belirlemek için
    const isActive = (path) => {
        // Çoklu pathleri kontrol etmek için
        if (Array.isArray(path)) {
            return path.some(p => router.pathname.startsWith(p)) ? 'active' : '';
        }
        return router.pathname.startsWith(path) ? 'active' : '';
    };

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <header style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e9ecef',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 20px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '60px'
                    }}>
                        {/* Logo ve site adı */}
                        <Link href="/articles" style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: '#0070f3',
                            textDecoration: 'none'
                        }}>
                            Simple News
                        </Link>

                        {/* Ana navigasyon */}
                        <nav>
                            <ul style={{
                                display: 'flex',
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                                gap: '20px'
                            }}>
                                <li>
                                    <Link href="/articles" style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        color: isActive('/articles') ? '#0070f3' : '#333',
                                        fontWeight: isActive('/articles') ? 'bold' : 'normal',
                                        textDecoration: 'none',
                                        backgroundColor: isActive('/articles') ? 'rgba(0, 112, 243, 0.1)' : 'transparent'
                                    }}>
                                        Haberler
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/create" style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        color: isActive('/create') ? '#0070f3' : '#333',
                                        fontWeight: isActive('/create') ? 'bold' : 'normal',
                                        textDecoration: 'none',
                                        backgroundColor: isActive('/create') ? 'rgba(0, 112, 243, 0.1)' : 'transparent'
                                    }}>
                                        Yeni Haber
                                    </Link>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '20px',
                minHeight: 'calc(100vh - 140px)' // Header ve footer dışında
            }}>
                {children}
            </main>

            <footer style={{
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #e9ecef',
                textAlign: 'center',
                padding: '20px',
                color: '#666',
                fontSize: '0.9rem'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <p>© {new Date().getFullYear()} Simple News - Tüm hakları saklıdır.</p>
                </div>
            </footer>
        </>
    );
}