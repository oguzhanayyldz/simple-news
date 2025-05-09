import { useState, useEffect } from 'react';

export default function useAnonymousId() {
    const [anonymousId, setAnonymousId] = useState(null);
    const [username, setUsername] = useState('');
    
    useEffect(() => {
        try {
            // Direkt olarak sayısal bir ID ve kullanıcı adı oluşturalım
            // Session storage kullanarak tarayıcı sekmesi kapatıldığında silinmesini sağlayalım
            const generateId = () => {
                // 1000-9999 arasında rastgele bir sayı
                return Math.floor(Math.random() * 9000) + 1000;
            };
            
            // Rastgele bir kullanıcı adı oluştur
            const generateUsername = (id) => {
                const adjectives = ['Hızlı', 'Parlak', 'Güçlü', 'Mutlu', 'Akıllı', 'Aktif', 'Sakin'];
                const nouns = ['Editör', 'Yazar', 'Okuyucu', 'Kullanıcı', 'Ziyaretçi'];
                
                const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
                const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
                
                return `${randomAdjective}${randomNoun}${id}`;
            };
            
            // Session storage'dan daha önce oluşturulmuş ID'yi al, yoksa yeni oluştur
            let id = sessionStorage.getItem('temp_user_id');
            let name = sessionStorage.getItem('temp_username');
            
            // ID yoksa veya sayı değilse yeni oluştur
            if (!id || isNaN(parseInt(id))) {
                id = generateId();
                sessionStorage.setItem('temp_user_id', id.toString());
            } else {
                id = parseInt(id);
            }
            
            // Kullanıcı adı yoksa yeni oluştur
            if (!name) {
                name = generateUsername(id);
                sessionStorage.setItem('temp_username', name);
            }
            
            console.log("Oluşturulan ID:", id);
            console.log("Oluşturulan Username:", name);
            
            // State'leri güncelle
            setAnonymousId(id);
            setUsername(name);
            
        } catch (error) {
            console.error("useAnonymousId hook hatası:", error);
            
            // Hata durumunda basit fallback değerler kullanalım
            const fallbackId = new Date().getTime() % 10000; // Son 4 hanesi
            const fallbackName = `Misafir${fallbackId}`;
            
            setAnonymousId(fallbackId);
            setUsername(fallbackName);
        }
    }, []);
    
    return { anonymousId, username };
}