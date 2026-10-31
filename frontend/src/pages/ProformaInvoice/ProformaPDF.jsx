// frontend/src/pages/ProformaInvoice/ProformaPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderBottom: '1 solid #333',
    paddingBottom: 10,
  },
  logo: {
    width: 80,
    height: 60,
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 8,
    lineHeight: 1.4,
    maxWidth: '60%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  clientLeft: {
    flex: 1,
  },
  clientRight: {
    textAlign: 'right',
    flex: 1,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    minHeight: 25,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#e6e6e6',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 4,
    fontSize: 8,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ccc',
  },
  tableImage: {
    width: 30,
    height: 30,
    objectFit: 'cover',
  },
  total: {
    marginTop: 10,
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 11,
  },
  notes: {
    marginTop: 20,
    fontSize: 8,
    fontStyle: 'italic',
    borderTop: '1 solid #ccc',
    paddingTop: 10,
  },
  bankInfo: {
    marginTop: 20,
    fontSize: 8,
    backgroundColor: '#f9f9f9',
    padding: 10,
  },
});

const ProformaPDF = ({ invoiceData }) => {
  const { client, delivery, items, totalAmount } = invoiceData;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE */}
        <View style={styles.headerRow}>
          <Image src="/logo.jpeg" style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>ANDREMED PROSPERITY DIAGNOSTICS Sarl</Text>
            <Text>Siège social : 004 BUNAGANA, Quartier KATINDO, C/GOMA, Nord-Kivu-DRC</Text>
            <Text>Bureau regional Bunia: 118 Logo, Q. BAKONGOLO, C/MBUNYA, Bunia, ITURI-DRC</Text>
            <Text>Registor : CD/RCCM/22-A-01133, ID Nat : 19-G4701-N96836J</Text>
            <Text>Tel: +243 81 70 29 631, +375 25 536-87-47</Text>
            <Text>E-mail : contact@andremed.org    Site : www.andremed.org</Text>
          </View>
        </View>

        {/* TITRE */}
        <Text style={styles.title}>
          FACTURE PROFORMA: {delivery.invoiceNumber || 'ANDREMED/BUN-015/08'}
        </Text>

        {/* SECTION CLIENT + LIVRAISON (deux colonnes) */}
        <View style={styles.clientSection}>
          <View style={styles.clientLeft}>
            <Text style={{ fontWeight: 'bold' }}>TO MESSRS:</Text>
            <Text>Contact person: {client.contactPerson || ''}</Text>
            <Text>Email: {client.email || ''}</Text>
            <Text>Phone number: {client.phone || ''}</Text>
            <Text>Address: {client.address || ''}</Text>
            <Text>Pièces à ajouter:</Text>
            <Text> - Contrat de partenariat ANDREMED si demandé</Text>
            <Text> - Catalogue de nos produits au besoin</Text>
          </View>
          <View style={styles.clientRight}>
            <Text>Invoice Number: {delivery.invoiceNumber || ''}</Text>
            <Text>Date: {delivery.date || ''}</Text>
            <Text>Delivery place: {delivery.deliveryPlace || ''}</Text>
            <Text>Delivery time: {delivery.deliveryTime || ''}</Text>
            <Text>Destination: {delivery.destination || ''}</Text>
            <Text>Term of payment: {delivery.paymentTerm || ''}</Text>
          </View>
        </View>

        {/* TABLEAU DES ARTICLES */}
        <View style={styles.table}>
          {/* En-tête */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 0.5 }]}>S.N</Text>
            <Text style={[styles.tableCell, { flex: 1.8 }]}>Item Name</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Model</Text>
            <Text style={[styles.tableCell, { flex: 2.2 }]}>Description</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Picture</Text>
            <Text style={[styles.tableCell, { flex: 0.6 }]}>Qty</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>EXW Unit price (USD)</Text>
            <Text style={[styles.tableCell, { flex: 1.2 }]}>Total Amount (USD)</Text>
          </View>

          {/* Lignes */}
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.5 }]}>{item.sn}</Text>
              <Text style={[styles.tableCell, { flex: 1.8 }]}>{item.item_name}</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>{item.model || ''}</Text>
              <Text style={[styles.tableCell, { flex: 2.2 }]}>{item.description || ''}</Text>
              <View style={[styles.tableCell, { flex: 0.8 }]}>
                {item.picture_url ? (
                  <Image src={item.picture_url} style={styles.tableImage} />
                ) : (
                  <Text>—</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { flex: 0.6 }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>US$ {item.exw_unit_price.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>US$ {item.total_amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* TOTAL */}
        <View style={styles.total}>
          <Text>Total Amount (Not including bank service charge and taxes): US$ {totalAmount.toFixed(2)}</Text>
        </View>

        {/* NOTES */}
        <View style={styles.notes}>
          <Text>
            {delivery.notes || 'Cette facture est provisoire et ne constitue pas la facture finale du marché. Un ajustement éventuel des prix pourra être effectué après validation du présent document, conformément aux accords convenus entre les parties. Les prix restent légèrement négociables.'}
          </Text>
        </View>

        {/* COORDONNÉES BANCAIRES */}
        <View style={styles.bankInfo}>
          <Text style={{ fontWeight: 'bold' }}>Company Bank Information by T/T (USD)</Text>
          <Text>Company Name: ANDREMED PROSPERITY DIAGNOSTICS SARL</Text>
          <Text>Account No: 1252-3914019-00-95</Text>
          <Text>Bank Name: Trust Merchant Bank S.A</Text>
          <Text>SWIFT Code: TRMSCD3L</Text>
          <Text>Bank address in English: 177, Boulevard de la Libération, Lumumba Bunia, ITURI-DRC.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ProformaPDF;