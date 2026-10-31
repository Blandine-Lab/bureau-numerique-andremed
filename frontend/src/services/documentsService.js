// src/services/documentsService.js
import { supabase } from '../utils/supabaseClient';

const BUCKET = 'dossiers-documents';
const MAX_SIZE = 20 * 1024 * 1024;

const sanitize = (str) => String(str).replace(/[^a-zA-Z0-9._-]/g, '_');

export const uploadDocument = async ({ file, dossierId, sousDossier, userId }) => {
  if (file.size > MAX_SIZE) {
    throw new Error(`Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)`);
  }
  const timestamp = Date.now();
  const safeName = sanitize(file.name);
  const safeFolder = sanitize(sousDossier);
  const storagePath = `${dossierId}/${safeFolder}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({
      dossier_id: dossierId,
      sous_dossier: sousDossier,
      nom_fichier: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      taille_octets: file.size,
      uploaded_by: userId || null,
    })
    .select()
    .single();
  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw dbError;
  }
  return data;
};

export const getSignedUrl = async (storagePath, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

export const getDownloadUrl = getSignedUrl;

export const listDocuments = async (dossierId, sousDossier) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('dossier_id', dossierId)
    .eq('sous_dossier', sousDossier)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const renameDocument = async (documentId, newName) => {
  if (!newName || !newName.trim()) {
    throw new Error('Le nom ne peut pas etre vide');
  }
  const { data, error } = await supabase
    .from('documents')
    .update({ nom_fichier: newName.trim(), updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteDocument = async (documentId, storagePath) => {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);
  if (storageError) throw storageError;
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);
  if (dbError) throw dbError;
};

export const getOfficePreviewUrl = async (storagePath) => {
  const signedUrl = await getSignedUrl(storagePath, 600);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
};

export const getTextContent = async (storagePath) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error) throw error;
  return await data.text();
};

export const updateTextContent = async (document, newContent) => {
  const mime = document.mime_type || 'text/plain';
  const blob = new Blob([newContent], { type: mime });
  const file = new File([blob], document.nom_fichier, { type: mime });
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(document.storage_path, file, { contentType: mime, upsert: true });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from('documents')
    .update({ taille_octets: blob.size, updated_at: new Date().toISOString() })
    .eq('id', document.id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const listSousDossiersCustom = async (dossierId) => {
  const { data, error } = await supabase
    .from('sous_dossiers_custom')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const createSousDossierCustom = async (dossierId, nom) => {
  if (!nom || !nom.trim()) {
    throw new Error('Le nom ne peut pas etre vide');
  }
  const { data, error } = await supabase
    .from('sous_dossiers_custom')
    .insert({ dossier_id: dossierId, nom: nom.trim() })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('Un sous-dossier avec ce nom existe deja');
    }
    throw error;
  }
  return data;
};

export const renameSousDossierCustom = async (id, dossierId, oldName, newName) => {
  if (!newName || !newName.trim()) {
    throw new Error('Le nom ne peut pas etre vide');
  }
  if (newName.trim() === oldName) return null;
  const { data, error } = await supabase
    .from('sous_dossiers_custom')
    .update({ nom: newName.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const { error: docError } = await supabase
    .from('documents')
    .update({ sous_dossier: newName.trim() })
    .eq('dossier_id', dossierId)
    .eq('sous_dossier', oldName);
  if (docError) throw docError;
  return data;
};

export const deleteSousDossierCustom = async (id, dossierId, nom) => {
  const { data: docs, error: countError } = await supabase
    .from('documents')
    .select('id')
    .eq('dossier_id', dossierId)
    .eq('sous_dossier', nom);
  if (countError) throw countError;
  if (docs && docs.length > 0) {
    throw new Error(`Ce sous-dossier contient ${docs.length} document(s). Supprime-les ou deplace-les d'abord.`);
  }
  const { error } = await supabase
    .from('sous_dossiers_custom')
    .delete()
    .eq('id', id);
  if (error) throw error;
};