import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProformaItemsList = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sn: '',
    item_name: '',
    model: '',
    description: '',
    picture_url: '',
    quantity: 0,
    exw_unit_price: 0,
    company_seller: '',
  });

  const fetchItems = async () => {
    try {
      const res = await api.get('/proforma-items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err) {
      setError('Erreur chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/proforma-items/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post('/proforma-items', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setFormData({ sn: '', item_name: '', model: '', description: '', picture_url: '', quantity: 0, exw_unit_price: 0, company_seller: '' });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      setError('Erreur sauvegarde');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      sn: item.sn,
      item_name: item.item_name,
      model: item.model || '',
      description: item.description || '',
      picture_url: item.picture_url || '',
      quantity: item.quantity,
      exw_unit_price: item.exw_unit_price,
      company_seller: item.company_seller || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      await api.delete(`/proforma-items/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems();
    } catch (err) {
      setError('Erreur suppression');
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Données proforma</h1>
      <p>Gestion des articles pour les factures proforma</p>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
        <input name="sn" placeholder="S.N" value={formData.sn} onChange={handleInputChange} required />
        <input name="item_name" placeholder="Nom article" value={formData.item_name} onChange={handleInputChange} required />
        <input name="model" placeholder="Modèle" value={formData.model} onChange={handleInputChange} />
        <input name="description" placeholder="Description" value={formData.description} onChange={handleInputChange} />
        <input name="picture_url" placeholder="URL image" value={formData.picture_url} onChange={handleInputChange} />
        <input name="quantity" type="number" placeholder="Qté" value={formData.quantity} onChange={handleInputChange} required />
        <input name="exw_unit_price" type="number" step="0.01" placeholder="Prix unitaire (USD)" value={formData.exw_unit_price} onChange={handleInputChange} required />
        <input name="company_seller" placeholder="Vendeur société" value={formData.company_seller} onChange={handleInputChange} />
        <button type="submit">{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ sn: '', item_name: '', model: '', description: '', picture_url: '', quantity: 0, exw_unit_price: 0, company_seller: '' }); }}>Annuler</button>}
      </form>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>S.N</th>
            <th>Item Name</th>
            <th>Model</th>
            <th>Description</th>
            <th>Picture</th>
            <th>Qty</th>
            <th>Unit Price (USD)</th>
            <th>Total Amount (USD)</th>
            <th>Company Seller</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.sn}</td>
              <td>{item.item_name}</td>
              <td>{item.model}</td>
              <td>{item.description}</td>
              <td>{item.picture_url && <img src={item.picture_url} alt="pic" style={{ width: '50px' }} />}</td>
              <td>{item.quantity}</td>
              <td>{item.exw_unit_price}</td>
              <td>{item.total_amount}</td>
              <td>{item.company_seller}</td>
              <td>
                <button onClick={() => handleEdit(item)}>✏️</button>
                <button onClick={() => handleDelete(item.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProformaItemsList;