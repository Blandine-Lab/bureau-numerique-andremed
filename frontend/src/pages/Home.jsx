import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { dossiers } from '../data/dossiers';

const CarteModule = ({ item, loaded, idx, showCode }) => {
  const navigate = useNavigate();
  const hasSousDossiers = Array.isArray(item.sousDossiers) && item.sousDossiers.length > 0;

  return (
    <div
      onClick={() => navigate(item.path)}
      style={{
        backgroundColor: 'white',
        borderRadius: '0.8rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: loaded ? 'translateY(0)' : 'translateY(20px)',
        opacity: loaded ? 1 : 0,
        animation: loaded ? `fadeInUp 0.4s ease-out ${idx * 0.03}s both` : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ overflow: 'hidden', height: '120px' }}>
        <img
          src={item.image}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.target.src = '/default.jpg'; }}
        />
      </div>
      <div style={{ padding: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1f2937' }}>
          {showCode && item.id ? `Dossier ${item.id} – ` : ''}{item.name}
        </div>
        <div style={{ marginTop: '0.3rem', color: '#3b82f6', fontSize: '0.75rem' }}>
          {hasSousDossiers
            ? `${item.sousDossiers.length} sous-dossiers →`
            : 'Accéder →'}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState(null);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    clearTimeout(clickTimer);
    const timer = setTimeout(() => setClickCount(0), 3000);
    setClickTimer(timer);
    if (newCount >= 5) {
      clearTimeout(timer);
      setClickCount(0);
      navigate('/admin');
    }
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 0.5rem',
  };

  return (
    <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f2ff 100%)', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeInDown 0.8s ease-out' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <img
            src="/logo.jpg"
            alt="Logo ANDREMED"
            onClick={handleLogoClick}
            style={{ height: '60px', width: 'auto', cursor: 'pointer' }}
            onError={(e) => { e.target.src = '/default.jpg'; }}
          />
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            ANDREMED
          </h1>
          <p style={{ color: '#374151', fontSize: '1rem', fontWeight: '500', margin: 0 }}>
            Logiciel de Gestion intégrée de vente mixte des produits
          </p>
          {clickCount > 0 && (
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {5 - clickCount} clics restants...
            </span>
          )}
        </div>
      </div>

      <h2 style={{ maxWidth: '1200px', margin: '0 auto 0.75rem', color: '#1e3a8a', fontSize: '1.1rem' }}>
        Organisation documentaire ANDREMED
      </h2>
      <div style={gridStyle}>
        {dossiers.map((d, idx) => (
          <CarteModule
            key={`d-${d.id}`}
            item={d}
            loaded={loaded}
            idx={idx}
            showCode={true}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6b7280', fontSize: '0.75rem' }}>
        © 2025 ANDREMED PROSPERITY DIAGNOSTICS - Tous droits réservés
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 480px) {
          .home-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;