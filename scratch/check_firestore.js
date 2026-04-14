const admin = require('firebase-admin');

// Initialize with the project ID
admin.initializeApp({
  projectId: 'opf4896system'
});

const db = admin.firestore();

async function checkData() {
  console.log('--- Checking Collection: orders ---');
  const ordersSnap = await db.collection('orders').limit(5).get();
  console.log(`Total sample orders: ${ordersSnap.size}`);
  ordersSnap.forEach(doc => {
    console.log(`Order ID: ${doc.id}, Status: ${doc.data().status}, DeliveryStatus: ${doc.data().deliveryStatus}`);
  });

  const pendingOrdersSnap = await db.collection('orders').where('status', '==', 'pending').get();
  console.log(`Total pending orders: ${pendingOrdersSnap.size}`);

  console.log('\n--- Checking Collection: delivery_orders ---');
  const doSnap = await db.collection('delivery_orders').orderBy('timestamp', 'desc').limit(10).get();
  console.log(`Total DOs in sample: ${doSnap.size}`);
  doSnap.forEach(doc => {
    const data = doc.data();
    console.log(`DO No: ${doc.id}, Customer: ${data.customerName}, Lorry: ${data.lorry}, Date: ${data.timestamp ? data.timestamp.toDate().toISOString() : 'N/A'}`);
  });
}

checkData().catch(console.error);
