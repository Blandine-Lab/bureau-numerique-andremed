import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ProformaPDF from './ProformaPDF';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProformaInvoiceCreate = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [deliveryInfo, setDeliveryInfo] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    deliveryPlace: '',
    deliveryTime: '',
    destination: '',
    paymentTerm: '',
    notes: '',
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get('/proforma-items', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setItems(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleCheck = (item) => {
    setSelectedItems(prev => {
      if (prev.find(i => i.id === item.id)) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const totalAmount = selectedItems.reduce((sum, i) => sum + i.total_amount, 0);

  const invoiceData = {
    client: clientInfo,
    delivery: deliveryInfo,
    items: selectedItems,
    totalAmount: totalAmount,
  };

  if (loading) return <div>Chargement des articles...</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Générer Facture Proforma</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Informations client</h3>
          <input placeholder="Nom société" value={clientInfo.name} onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })} />
          <input placeholder="Personne contact" value={clientInfo.contactPerson} onChange={(e) => setClientInfo({ ...clientInfo, contactPerson: e.target.value })} />
          <input placeholder="Email" value={clientInfo.email} onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })} />
          <input placeholder="Téléphone" value={clientInfo.phone} onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })} />
          <input placeholder="Adresse" value={clientInfo.address} onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })} />
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Informations livraison</h3>
          <input placeholder="N° facture (ex: ANDREMED/BUN-015/08)" value={deliveryInfo.invoiceNumber} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, invoiceNumber: e.target.value })} />
          <input type="date" value={deliveryInfo.date} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, date: e.target.value })} />
          <input placeholder="Lieu de livraison" value={deliveryInfo.deliveryPlace} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliveryPlace: e.target.value })} />
          <input placeholder="Délai de livraison" value={deliveryInfo.deliveryTime} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliveryTime: e.target.value })} />
          <input placeholder="Destination" value={deliveryInfo.destination} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, destination: e.target.value })} />
          <input placeholder="Conditions paiement (ex: T/T)" value={deliveryInfo.paymentTerm} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, paymentTerm: e.target.value })} />
          <textarea placeholder="Notes" value={deliveryInfo.notes} onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })} rows="3" />
        </div>
      </div>

      <h3>Sélectionner les articles</h3>
      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '0.5rem' }}>
        {items.map(item => (
          <label key={item.id} style={{ display: 'block', margin: '0.3rem 0' }}>
            <input type="checkbox" checked={selectedItems.some(i => i.id === item.id)} onChange={() => handleCheck(item)} />
            {item.sn} - {item.item_name} (Qté: {item.quantity}, PU: {item.exw_unit_price} USD)
          </label>
        ))}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <strong>Total sélectionné : {totalAmount.toFixed(2)} USD</strong>
        <br />
        <PDFDownloadLink
          document={<ProformaPDF invoiceData={invoiceData} />}
          fileName={`proforma_${deliveryInfo.invoiceNumber || 'facture'}.pdf`}
        >
          {({ loading }) => (loading ? 'Génération du PDF...' : 'Télécharger le PDF')}
        </PDFDownloadLink>
      </div>
    </div>
  );
};

export default ProformaInvoiceCreate;