import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const ArticleService = {
    // Tüm haberleri getir
    getAllArticles: async () => {
        const response = await axios.get(`${API_URL}/api/articles`);
        return response.data;
    },
    
    // ID'ye göre haber getir
    getArticleById: async (id) => {
        const response = await axios.get(`${API_URL}/api/articles/${id}`);
        return response.data;
    },
    
    // Slug'a göre haber getir
    getArticleBySlug: async (slug) => {
        const response = await axios.get(`${API_URL}/api/articles?slug=${slug}`);
        return response.data[0];
    },
    
    // Yeni haber oluştur
    createArticle: async (article) => {
        const response = await axios.post(`${API_URL}/api/articles`, article);
        return response.data;
    },
    
    // Haber güncelle
    updateArticle: async (id, article) => {
        const response = await axios.put(`${API_URL}/api/articles/${id}`, article);
        return response.data;
    },
    
    // Haber sil
    deleteArticle: async (id) => {
        const response = await axios.delete(`${API_URL}/api/articles/${id}`);
        return response.data;
    },
    
    // Haberi hemen yayınla
    publishArticle: async (id) => {
        const response = await axios.post(`${API_URL}/api/articles/${id}/publish`);
        return response.data;
    },
    
    // Düzenleme oturumu başlat
    startEditingSession: async (id) => {
        const response = await axios.post(`${API_URL}/api/articles/${id}/editing-session`);
        return response.data;
    },
    
    // Düzenleme oturumu sonlandır
    endEditingSession: async (id) => {
        const response = await axios.delete(`${API_URL}/api/articles/${id}/editing-session`);
        return response.data;
    },
    
    // Düzenleme oturumu bilgisini getir (Bu endpoint listede yok, eklenebilir)
    getEditingSession: async (id) => {
        try {
            const response = await axios.get(`${API_URL}/api/articles/${id}/editing-session`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { editor: null };
            }
            throw error;
        }
    }
};