async function runTests() {
  const baseUrl = 'http://localhost:5000';
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log('  [PASS]', msg);
      passed++;
    } else {
      console.error('  [FAIL]', msg);
      failed++;
    }
  }

  console.log('--- 1. Testing Shop Info API ---');
  const infoRes = await fetch(baseUrl + '/api/shop-info');
  const info = await infoRes.json();
  assert(info.shopName === "SIVA'S FAST FOOD", 'Shop Name matches');
  assert(info.tagline === 'FAST • FRESH • FIERY', 'Tagline matches');
  assert(info.location.includes('Srivilliputhur'), 'Location matches');

  console.log('\n--- 2. Testing Menu API & Category Coverage ---');
  const menuRes = await fetch(baseUrl + '/api/menu');
  const menu = await menuRes.json();
  assert(menu.items.length >= 35, 'Loaded all menu items (Found: ' + menu.items.length + ')');
  const cats = menu.categories;
  assert(cats.includes('Fried Chicken'), 'Category Fried Chicken present');
  assert(cats.includes('Fried Rice'), 'Category Fried Rice present');
  assert(cats.includes("Momo's"), 'Category Momos present');
  assert(cats.includes('Noodles'), 'Category Noodles present');
  assert(cats.includes('Omelette'), 'Category Omelette present');
  assert(cats.includes('Mojitos'), 'Category Mojitos present');

  // Verify prices from photo
  const chicken1pc = menu.items.find(i => i.name === '1 Pc Fried Chicken');
  assert(chicken1pc && chicken1pc.price === 50, '1 Pc Fried Chicken is ₹50');
  const vegRice = menu.items.find(i => i.name === 'Veg Fried Rice');
  assert(vegRice && vegRice.price === 80, 'Veg Fried Rice is ₹80');
  const lemonMojito = menu.items.find(i => i.name === 'Lemon Mojito');
  assert(lemonMojito && lemonMojito.price === 50, 'Lemon Mojito is ₹50');
  const studentCombo = menu.items.find(i => i.name.includes('Student Combo'));
  assert(studentCombo && studentCombo.price === 100, 'Student Combo is ₹100');

  console.log('\n--- 3. Testing Customer Order Placement (No Table, Pure Token) ---');
  const orderPayload = {
    items: [
      { menuItemId: chicken1pc.id, quantity: 2 }, // 2 * 50 = 100
      { menuItemId: vegRice.id, quantity: 1 },    // 1 * 80 = 80
      { menuItemId: lemonMojito.id, quantity: 1 } // 1 * 50 = 50
    ],
    customerNotes: 'Extra crispy chicken, less ice in mojito'
  };
  const orderRes = await fetch(baseUrl + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  const orderData = await orderRes.json();
  assert(orderRes.status === 201, 'Order created successfully with HTTP 201');
  assert(orderData.orderNumber === 101, 'First order token number is #101');
  assert(orderData.totalAmount === 230, 'Total computed accurately on backend: ₹230 (100+80+50)');
  assert(orderData.status === 'NEW', 'Initial order status is NEW');
  assert(orderData.items.length === 3, 'All 3 items saved with order');

  console.log('\n--- 4. Testing Customer Live Status Endpoint ---');
  const trackRes = await fetch(baseUrl + '/api/orders/101');
  const trackData = await trackRes.json();
  assert(trackData.order_number === 101, 'Customer can look up token #101');
  assert(trackData.status === 'NEW', 'Status is NEW');

  console.log('\n--- 5. Testing Owner Login & Authentication ---');
  const loginRes = await fetch(baseUrl + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'siva123' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.token, 'Owner successfully logged in with JWT token');
  const token = loginData.token;

  console.log('\n--- 6. Testing Owner Dashboard Stats ---');
  const statsRes = await fetch(baseUrl + '/api/admin/stats', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const statsData = await statsRes.json();
  assert(statsData.today.orders >= 1, 'Today orders count reflects new order');
  assert(statsData.today.sales >= 230, 'Today sales reflects ₹230');
  assert(statsData.today.pending >= 1, 'Pending orders count updated');

  console.log('\n--- 7. Testing Order Status Progression (NEW -> PREPARING -> READY -> COMPLETED) ---');
  // Transition to PREPARING
  const p1 = await fetch(baseUrl + '/api/admin/orders/' + orderData.orderId + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ status: 'PREPARING' })
  });
  const d1 = await p1.json();
  assert(d1.order.status === 'PREPARING', 'Order #101 status transitioned to PREPARING');

  // Transition to READY
  const p2 = await fetch(baseUrl + '/api/admin/orders/' + orderData.orderId + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ status: 'READY' })
  });
  const d2 = await p2.json();
  assert(d2.order.status === 'READY', 'Order #101 status transitioned to READY');

  // Transition to COMPLETED
  const p3 = await fetch(baseUrl + '/api/admin/orders/' + orderData.orderId + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  const d3 = await p3.json();
  assert(d3.order.status === 'COMPLETED', 'Order #101 status transitioned to COMPLETED');

  console.log('\n--- 8. Testing Printable Bill Receipt ---');
  const billRes = await fetch(baseUrl + '/api/admin/bill/101');
  const billData = await billRes.json();
  assert(billData.order.order_number === 101, 'Bill generated for Token #101');
  assert(billData.shop.name === "SIVA'S FAST FOOD", 'Bill includes shop branding');
  assert(billData.order.total_amount === 230, 'Bill total matches ₹230');

  console.log('\n--- 9. Testing Shop Counter QR Code Generation ---');
  const qrRes = await fetch(baseUrl + '/api/admin/qr', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const qrData = await qrRes.json();
  assert(qrData.qrDataUrl && qrData.qrDataUrl.startsWith('data:image/png;base64,'), 'High-res QR code PNG data generated');

  console.log('\n--- 10. Testing Menu Item Out-of-Stock Toggle ---');
  const toggleRes = await fetch(baseUrl + '/api/admin/menu/' + chicken1pc.id + '/toggle-availability', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token }
  });
  const toggled = await toggleRes.json();
  assert(toggled.available === 0, 'Item set to Unavailable');
  // Toggle back
  await fetch(baseUrl + '/api/admin/menu/' + chicken1pc.id + '/toggle-availability', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token }
  });

  console.log('\n--- 11. Testing Frontend Static Delivery ---');
  const htmlRes = await fetch(baseUrl + '/');
  const htmlText = await htmlRes.text();
  assert(htmlText.includes('doctype html') || htmlText.includes('<div id="root">'), 'Frontend React index.html served');

  const assetRes = await fetch(baseUrl + '/assets/logo.png');
  assert(assetRes.status === 200, 'Logo asset accessible over HTTP');

  console.log('\n=======================================');
  console.log('TOTAL TESTS: ' + (passed + failed) + ' | PASSED: ' + passed + ' | FAILED: ' + failed);
  console.log('=======================================');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('Test error:', err); process.exit(1); });
