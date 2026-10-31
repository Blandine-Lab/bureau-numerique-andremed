import axios from 'axios';

// Utiliser la variable d'environnement VITE_API_URL si définie, sinon l'URL distante par défaut
const API_URL = import.meta.env.VITE_API_URL || 'https://gloria-gestion-final-backend.vercel.app/api';

console.log('🔍 API_URL =', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;