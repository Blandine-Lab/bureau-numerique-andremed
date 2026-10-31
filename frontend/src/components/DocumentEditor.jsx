import { useEffect, useRef, useState } from 'react';

// Origine de l'éditeur (utilisée pour sécuriser les postMessage)
const EDITOR_ORIGIN = 'https://edit.chaxus.com';

// URL de l'éditeur en mode "embed" (sans interface de navigation)
const EDITOR_URL = `${EDITOR_ORIGIN}/editor?embed=1`;

const DocumentEditor = ({ fileUrl, fileName, onSave, onClose }) => {
  const iframeRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  // Envoie une commande à l'éditeur avec un id unique pour le suivi
  const sendCommand = (type, payload = {}) => {
    if (!iframeRef.current?.contentWindow) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    iframeRef.current.contentWindow.postMessage(
      { id, type, payload },
      EDITOR_ORIGIN
    );
  };

  // Extrait l'extension cible pour la sauvegarde (DOCX, XLSX, PPTX)
  const getTargetExt = () => {
    const ext = (fileName || '').split('.').pop().toUpperCase();
    if (['DOCX', 'XLSX', 'PPTX'].includes(ext)) return ext;
    return 'DOCX';
  };

  // Écoute les événements envoyés par l'éditeur
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== EDITOR_ORIGIN) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'document:ready':
          setEditorReady(true);
          // Une fois prêt, on demande l'ouverture du fichier
          sendCommand('document:open-url', {
            url: fileUrl,
            fileName: fileName,
            readonly: false,
          });
          break;

        case 'document:opened':
          // Le fichier est chargé dans l'éditeur
          break;

        case 'document:dirty-changed':
          setDirty(!!data.payload?.dirty);
          break;

        case 'document:saved':
          setDirty(false);
          setSaving(false);
          if (data.payload?.file) {
            onSave(data.payload.file);
          } else {
            setError("L'éditeur n'a pas renvoyé de fichier.");
          }
          break;

        case 'document:error':
          setError(data.payload?.message || "Erreur dans l'éditeur.");
          setSaving(false);
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fileUrl, fileName, onSave]);

  // Demande explicitement la sauvegarde
  const handleSave = () => {
    if (!editorReady || saving) return;
    setSaving(true);
    setError(null);
    sendCommand('document:save', {
      targetExt: getTargetExt(),
      returnOriginalOnTimeout: false,
    });
  };

  // Ferme le modal, en avertissant si des modifications ne sont pas sauvegardées
  const handleClose = () => {
    if (dirty) {
      const confirmed = window.confirm(
        'Des modifications ne sont pas encore sauvegardées. Fermer quand même ?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Barre d'outils */}
      <div
        style={{
          padding: '0.75rem 1rem',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <strong>✏️ Édition – {fileName}</strong>
          {!editorReady && (
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              ⏳ Chargement…
            </span>
          )}
          {editorReady && (
            <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>
              ✅ Prêt
            </span>
          )}
          {dirty && editorReady && (
            <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
              ● Non sauvegardé
            </span>
          )}
          {error && (
            <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>
              ⚠️ {error}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            disabled={!editorReady || saving}
            style={{
              padding: '0.5rem 1rem',
              background: saving ? '#9ca3af' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '0.4rem',
              cursor:
                saving || !editorReady ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
          </button>
          <button
            onClick={handleClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #cbd5e1',
              background: 'white',
              borderRadius: '0.4rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ✕ Fermer
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={EDITOR_URL}
          title="Éditeur de documents"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white',
          }}
        />
      </div>

      <div
        style={{
          padding: '0.5rem 1rem',
          background: '#fef3c7',
          fontSize: '0.8rem',
          color: '#92400e',
          borderTop: '1px solid #fde68a',
        }}
      >
        💡 Clique sur <strong>💾 Enregistrer</strong> pour sauvegarder.
        Si la sauvegarde automatique ne fonctionne pas, utilise{' '}
        <strong>Fichier → Télécharger</strong> dans l'éditeur, puis dans
        l'application : <strong>🗑️</strong> l'ancien fichier et{' '}
        <strong>📤</strong> le nouveau.
      </div>
    </div>
  );
};

export default DocumentEditor;