import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getDossierById } from '../data/dossiers';
import { useAuth } from '../context/AuthContext';
import {
  uploadDocument,
  getSignedUrl,
  listDocuments,
  renameDocument,
  deleteDocument,
  getOfficePreviewUrl,
  getTextContent,
  updateTextContent,
  listSousDossiersCustom,
  createSousDossierCustom,
  renameSousDossierCustom,
  deleteSousDossierCustom,
} from '../services/documentsService';
import DocumentEditor from '../components/DocumentEditor';

const fileIcon = (mime = '') => {
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('word') || mime.includes('officedocument.word')) return '📘';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('officedocument.spreadsheet')) return '📗';
  if (mime.includes('presentation') || mime.includes('powerpoint') || mime.includes('officedocument.presentation')) return '📙';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('zip')) return '🗜️';
  return '📄';
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
};

const isOfficeFile = (mime = '', name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return mime.includes('officedocument') || ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
};

const isEditableOfficeFile = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return ['docx', 'xlsx', 'pptx'].includes(ext);
};

const isTextFile = (mime = '', name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return mime.startsWith('text/') || ['txt', 'md', 'markdown', 'log', 'csv'].includes(ext);
};

const isPrintable = (mime = '', name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return mime.includes('pdf') || mime.startsWith('image/') || ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
};

const btnStyle = {
  padding: '0.3rem 0.5rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.3rem',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.9rem',
};

const generateFile = async (type, name) => {
  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'nouveau';

  if (type === 'docx') {
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: name, bold: true, size: 32 })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    return new File([blob], `${safeName}.docx`, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  if (type === 'xlsx') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[name], ['']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Feuille1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], `${safeName}.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  if (type === 'pptx') {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    slide.addText(name, { x: 1, y: 1, w: 8, h: 2, fontSize: 32, bold: true });
    const blob = await pptx.write({ outputType: 'blob' });
    return new File([blob], `${safeName}.pptx`, {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
  }

  if (type === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.text(name, 20, 30);
    const blob = pdf.output('blob');
    return new File([blob], `${safeName}.pdf`, { type: 'application/pdf' });
  }

  if (type === 'txt') {
    const blob = new Blob([`# ${name}\n\n`], { type: 'text/plain' });
    return new File([blob], `${safeName}.txt`, { type: 'text/plain' });
  }

  if (type === 'md') {
    const blob = new Blob([`# ${name}\n\n`], { type: 'text/markdown' });
    return new File([blob], `${safeName}.md`, { type: 'text/markdown' });
  }

  throw new Error('Type de fichier non supporté');
};

const DossierDocumentaire = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dossier = getDossierById(id);

  const [active, setActive] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [officeEditingFile, setOfficeEditingFile] = useState(null);
  const [officeEditingUrl, setOfficeEditingUrl] = useState('');
  const [customFolders, setCustomFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);

  useEffect(() => {
    if (!dossier) return;
    setLoadingFolders(true);
    listSousDossiersCustom(dossier.id)
      .then(setCustomFolders)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingFolders(false));
  }, [dossier]);

  useEffect(() => {
    if (!active || !dossier) return;
    setLoading(true);
    setError(null);
    listDocuments(dossier.id, active)
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [active, dossier]);

  if (!dossier) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Dossier introuvable.</p>
        <button onClick={() => navigate('/')}>← Retour</button>
      </div>
    );
  }

  const allSousDossiers = [
    ...dossier.sousDossiers.map((nom) => ({ nom, custom: false })),
    ...customFolders.map((f) => ({ nom: f.nom, custom: true, id: f.id })),
  ];

  const refresh = async () => {
    const docs = await listDocuments(dossier.id, active);
    setDocuments(docs);
  };

  const refreshFolders = async () => {
    const folders = await listSousDossiersCustom(dossier.id);
    setCustomFolders(folders);
  };

  const handleCreateFolder = async () => {
    const nom = window.prompt('Nom du nouveau sous-dossier :');
    if (!nom || !nom.trim()) return;
    if (allSousDossiers.some((s) => s.nom.toLowerCase() === nom.trim().toLowerCase())) {
      setError('Un sous-dossier avec ce nom existe déjà.');
      return;
    }
    setError(null);
    try {
      const created = await createSousDossierCustom(dossier.id, nom.trim());
      await refreshFolders();
      setActive(created.nom);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRenameFolder = async (folder) => {
    if (!folder.custom) return;
    const nouveauNom = window.prompt('Nouveau nom du sous-dossier :', folder.nom);
    if (!nouveauNom || nouveauNom.trim() === folder.nom) return;
    setError(null);
    try {
      await renameSousDossierCustom(folder.id, dossier.id, folder.nom, nouveauNom.trim());
      await refreshFolders();
      if (active === folder.nom) setActive(nouveauNom.trim());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!folder.custom) return;
    if (!window.confirm(`Supprimer le sous-dossier « ${folder.nom} » ?`)) return;
    setError(null);
    try {
      await deleteSousDossierCustom(folder.id, dossier.id, folder.nom);
      await refreshFolders();
      if (active === folder.nom) setActive(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !active) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument({ file, dossierId: dossier.id, sousDossier: active, userId: user?.id || null });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (type) => {
    if (!active) return;
    const name = window.prompt(
      `Nom du fichier ${type.toUpperCase()} (sans extension) :`,
      'Nouveau document'
    );
    if (!name || !name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const file = await generateFile(type, name.trim());
      await uploadDocument({ file, dossierId: dossier.id, sousDossier: active, userId: user?.id || null });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const url = await getSignedUrl(doc.storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nom_fichier;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) { setError(err.message); }
  };

  const handlePreview = async (doc) => {
    try {
      setPreviewDoc(doc);
      if (isOfficeFile(doc.mime_type, doc.nom_fichier)) {
        const url = await getOfficePreviewUrl(doc.storage_path);
        setPreviewUrl(url);
      } else {
        const url = await getSignedUrl(doc.storage_path, 600);
        setPreviewUrl(url);
      }
    } catch (err) { setError(err.message); }
  };

  const handlePrint = async (doc) => {
    try {
      const url = await getSignedUrl(doc.storage_path);
      const win = window.open(url, '_blank');
      if (!win) throw new Error('Autorise les popups pour imprimer');
      setTimeout(() => { try { win.print(); } catch {} }, 1000);
    } catch (err) { setError(err.message); }
  };

  const handleRename = async (doc) => {
    const newName = window.prompt('Nouveau nom :', doc.nom_fichier);
    if (!newName || newName.trim() === doc.nom_fichier) return;
    try {
      const updated = await renameDocument(doc.id, newName.trim());
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer définitivement « ${doc.nom_fichier} » ?`)) return;
    try {
      await deleteDocument(doc.id, doc.storage_path);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) { setError(err.message); }
  };

  const handleEditText = async (doc) => {
    try {
      setError(null);
      const content = await getTextContent(doc.storage_path);
      setEditingContent(content);
      setEditingDoc(doc);
    } catch (err) { setError(err.message); }
  };

  const handleSaveText = async () => {
    if (!editingDoc) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTextContent(editingDoc, editingContent);
      setDocuments((prev) => prev.map((d) => (d.id === editingDoc.id ? updated : d)));
      setEditingDoc(null);
      setEditingContent('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleEditOffice = async (doc) => {
    try {
      setError(null);
      const url = await getSignedUrl(doc.storage_path, 3600);
      setOfficeEditingUrl(url);
      setOfficeEditingFile(doc);
    } catch (err) { setError(err.message); }
  };

  const handleSaveOfficeFile = async (file) => {
    if (!officeEditingFile) return;
    setSaving(true);
    setError(null);
    try {
      await deleteDocument(officeEditingFile.id, officeEditingFile.storage_path);
      await uploadDocument({
        file,
        dossierId: dossier.id,
        sousDossier: active,
        userId: user?.id || null,
      });
      await refresh();
      setOfficeEditingFile(null);
      setOfficeEditingUrl('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const closeOfficeEditor = () => {
    setOfficeEditingFile(null);
    setOfficeEditingUrl('');
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
      >
        ← Accueil
      </button>

      <h1 style={{ color: '#1e3a8a', marginBottom: '0.25rem' }}>
        Dossier {dossier.id} – {dossier.name}
      </h1>
      {dossier.note && (
        <p style={{ color: '#6b7280', fontStyle: 'italic', marginBottom: '1rem' }}>{dossier.note}</p>
      )}

      {error && (
        <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.4rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', color: '#374151', margin: 0 }}>
              Sous-dossiers ({allSousDossiers.length})
            </h2>
            <button
              onClick={handleCreateFolder}
              title="Créer un sous-dossier personnalisé"
              style={{
                padding: '0.3rem 0.6rem',
                border: '1px solid #16a34a',
                background: 'white',
                color: '#16a34a',
                borderRadius: '0.3rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ➕ Nouveau
            </button>
          </div>

          {loadingFolders && <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Chargement…</p>}

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {allSousDossiers.map((folder) => (
              <li
                key={folder.custom ? `custom-${folder.id}` : folder.nom}
                style={{
                  padding: '0.6rem 0.8rem',
                  marginBottom: '0.4rem',
                  borderRadius: '0.4rem',
                  background: active === folder.nom ? '#dbeafe' : 'white',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
                onClick={() => setActive(folder.nom)}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📁 {folder.nom}
                  {folder.custom && (
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: '0.3rem' }}>(perso)</span>
                  )}
                </span>
                {folder.custom && (
                  <span style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder); }}
                      title="Renommer"
                      style={{ ...btnStyle, padding: '0.15rem 0.35rem', fontSize: '0.75rem' }}
                    >
                      🏷️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                      title="Supprimer"
                      style={{ ...btnStyle, padding: '0.15rem 0.35rem', fontSize: '0.75rem', color: '#dc2626' }}
                    >
                      🗑️
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: '2 1 500px', minWidth: '320px' }}>
          <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.5rem' }}>
            {active ? `Documents – ${active}` : 'Sélectionnez un sous-dossier'}
          </h2>

          {active ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                <label style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: uploading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  borderRadius: '0.4rem',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                }}>
                  {uploading ? '⏳ Upload en cours…' : '📤 Uploader un fichier'}
                  <input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.jpg,.jpeg,.png,.zip"
                  />
                </label>

                <select
                  disabled={creating}
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = '';
                    if (v) handleCreate(v);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #3b82f6',
                    color: '#3b82f6',
                    borderRadius: '0.4rem',
                    background: 'white',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="">{creating ? '⏳ Création…' : '➕ Créer un fichier…'}</option>
                  <option value="docx">📘 Word (.docx)</option>
                  <option value="xlsx">📗 Excel (.xlsx)</option>
                  <option value="pptx">📙 PowerPoint (.pptx)</option>
                  <option value="pdf">📕 PDF (.pdf)</option>
                  <option value="txt">📄 Texte (.txt)</option>
                  <option value="md">📝 Markdown (.md)</option>
                </select>
              </div>

              {loading && <p style={{ color: '#6b7280' }}>Chargement…</p>}
              {!loading && documents.length === 0 && (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucun document pour l’instant.</p>
              )}

              <div>
                {documents.map((doc) => {
                  const editableText = isTextFile(doc.mime_type, doc.nom_fichier);
                  const editableOffice = isEditableOfficeFile(doc.nom_fichier);
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.8rem',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.4rem',
                        marginBottom: '0.4rem',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{fileIcon(doc.mime_type)}</span>
                          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.nom_fichier}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          {formatSize(doc.taille_octets)} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        {editableText && (
                          <button title="Éditer (texte)" onClick={() => handleEditText(doc)} style={{ ...btnStyle, background: '#dbeafe' }}>📝</button>
                        )}
                        {editableOffice && (
                          <button title="Éditer (Office en ligne)" onClick={() => handleEditOffice(doc)} style={{ ...btnStyle, background: '#dbeafe' }}>✏️</button>
                        )}
                        <button title="Aperçu" onClick={() => handlePreview(doc)} style={btnStyle}>👁️</button>
                        <button title="Télécharger" onClick={() => handleDownload(doc)} style={btnStyle}>⬇️</button>
                        {isPrintable(doc.mime_type, doc.nom_fichier) && (
                          <button title="Imprimer" onClick={() => handlePrint(doc)} style={btnStyle}>🖨️</button>
                        )}
                        <button title="Renommer" onClick={() => handleRename(doc)} style={btnStyle}>🏷️</button>
                        <button title="Supprimer" onClick={() => handleDelete(doc)} style={{ ...btnStyle, color: '#dc2626' }}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
                💡 <strong>📝</strong> éditer un fichier texte — <strong>✏️</strong> éditer un Word/Excel/PowerPoint en ligne.
                Les sous-dossiers marqués <strong>(perso)</strong> peuvent être renommés (🏷️) ou supprimés (🗑️).
              </p>
            </>
          ) : (
            <div style={{ background: 'white', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              ← Choisissez un sous-dossier à gauche
            </div>
          )}
        </div>
      </div>

      {previewDoc && (
        <div
          onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '90vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '900px' }}
          >
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewDoc.nom_fichier}</strong>
              <button onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }} style={{ ...btnStyle, fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', background: '#f9fafb' }}>
              {!previewUrl && <p>Chargement de l’aperçu…</p>}
              {previewUrl && <iframe src={previewUrl} title="Aperçu" style={{ width: '100%', height: '70vh', border: 'none' }} />}
            </div>
          </div>
        </div>
      )}

      {editingDoc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div
            style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', width: '900px', overflow: 'hidden' }}
          >
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>📝 Édition – {editingDoc.nom_fichier}</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {editingContent.length} caractères · {editingContent.split(/\n/).length} ligne(s)
              </span>
            </div>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              disabled={saving}
              style={{
                flex: 1, width: '100%', minHeight: '50vh', padding: '1rem',
                border: 'none', outline: 'none', fontSize: '0.95rem',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                resize: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => { setEditingDoc(null); setEditingContent(''); }}
                disabled={saving}
                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '0.4rem', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveText}
                disabled={saving}
                style={{ padding: '0.5rem 1rem', background: saving ? '#9ca3af' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {officeEditingFile && (
        <DocumentEditor
          fileUrl={officeEditingUrl}
          fileName={officeEditingFile.nom_fichier}
          onSave={handleSaveOfficeFile}
          onClose={closeOfficeEditor}
        />
      )}
    </div>
  );
};

export default DossierDocumentaire;