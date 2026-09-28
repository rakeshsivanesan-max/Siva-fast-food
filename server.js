const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const QRCode = require('qrcode');
const { db, dbHelpers } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sivas_fast_food_super_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for food images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `item_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Client build static directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// Media assets & uploads
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/uploads', express.static(uploadsDir));

// ==========================================
// SSE (SERVER-SENT EVENTS) FOR REAL-TIME UPDATES
// ==========================================
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const payload = `data: ${JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('[SSE] Failed to send to client, removing:', err.message);
      sseClients.delete(client);
    }
  }
}

// Keep-alive ping every 15s to keep connections open
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.res.write(': keep-alive ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// SSE Endpoint
app.get('/api/orders/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client = { id: Date.now(), res };
  sseClients.add(client);
  console.log(`[SSE] Client connected. Total active SSE clients: ${sseClients.size}`);

  // Send initial welcome message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to Siva Fast Food live feed' })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
    console.log(`[SSE] Client disconnected. Total active SSE clients: ${sseClients.size}`);
  });
});

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
}

// ==========================================
// PUBLIC CUSTOMER API ENDPOINTS
// ==========================================

// Shop Info
app.get('/api/shop-info', (req, res) => {
  try {
    const settings = dbHelpers.getShopSettings();
    res.json({
      shopName: settings.shop_name || "SIVA'S FAST FOOD",
      tagline: settings.tagline || 'FAST • FRESH • FIERY',
      subtitle: settings.subtitle || 'Tasty Affordable Always',
      location: settings.location || 'Ramakrishnapuram, Srivilliputhur',
      slogan: settings.slogan || 'Good Food • Great Mood',
      tamilName: settings.tamil_name || 'சிவாஸ் பாஸ்ட் ஃபுட்'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Menu Items (Customer & Admin)
app.get('/api/menu', (req, res) => {
  try {
    // If ?all=true is passed with admin token, return all. Otherwise return all items with availability flags.
    const items = dbHelpers.getAllMenuItems(false);
    
    // Group by category for convenience
    const categories = [...new Set(items.map(i => i.category))];
    const grouped = {};
    for (const cat of categories) {
      grouped[cat] = items.filter(i => i.category === cat);
    }

    res.json({
      items,
      categories,
      grouped
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place Order (NO customer login, table-free takeaway token system)
app.post('/api/orders', (req, res) => {
  try {
    const { items, customerNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Please add items to place an order.' });
    }

    // Security: dbHelpers.createOrder re-fetches price from DB and computes server-side total
    const order = dbHelpers.createOrder(items, customerNotes);

    console.log(`[ORDER] Created Token #${order.order_number} for ₹${order.total_amount}`);

    // Broadcast in real-time to Owner Dashboard & any listeners
    broadcastEvent('NEW_ORDER', order);

    res.status(201).json({
      success: true,
      orderNumber: order.order_number,
      orderId: order.id,
      totalAmount: order.total_amount,
      status: order.status,
      items: order.items,
      customerNotes: order.customer_notes,
      createdAt: order.created_at
    });
  } catch (err) {
    console.error('[ORDER ERROR]', err);
    res.status(400).json({ error: err.message });
  }
});

// Customer Live Order Status Tracker & Receipt
app.get('/api/orders/:orderNumber', (req, res) => {
  try {
    const orderNumber = parseInt(req.params.orderNumber, 10);
    if (isNaN(orderNumber)) {
      return res.status(400).json({ error: 'Invalid order number' });
    }

    const order = dbHelpers.getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: `Order #${orderNumber} not found` });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// OWNER / ADMIN AUTHENTICATION
// ==========================================

app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/me', authenticateAdmin, (req, res) => {
  res.json({
    authenticated: true,
    user: req.admin
  });
});

// ==========================================
// OWNER DASHBOARD PROTECTED ENDPOINTS
// ==========================================

// Dashboard Statistics
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  try {
    const stats = dbHelpers.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders List & Filters
app.get('/api/admin/orders', authenticateAdmin, (req, res) => {
  try {
    const { status, search, date, limit } = req.query;
    const orders = dbHelpers.getOrders({ status, search, date, limit });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Status (NEW -> PREPARING -> READY -> COMPLETED)
app.patch('/api/admin/orders/:id/status', authenticateAdmin, (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(orderId) || !status) {
      return res.status(400).json({ error: 'Invalid order ID or status' });
    }

    const updated = dbHelpers.updateOrderStatus(orderId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Broadcast updated status in real-time to all screens
    broadcastEvent('ORDER_UPDATED', updated);

    res.json({
      success: true,
      order: updated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Menu Item CRUD
app.post('/api/admin/menu', authenticateAdmin, (req, res) => {
  try {
    const { name, category, price, image_url, description, is_veg, available, badge, sort_order } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }

    const item = dbHelpers.addMenuItem({
      name,
      category,
      price,
      image_url,
      description,
      is_veg,
      available,
      badge,
      sort_order
    });

    broadcastEvent('MENU_UPDATED', { action: 'ADD', item });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/menu/:id', authenticateAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const item = dbHelpers.updateMenuItem(id, req.body);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    broadcastEvent('MENU_UPDATED', { action: 'UPDATE', item });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Toggle In-Stock / Unavailable (Instant 1-Click for Owner)
app.patch('/api/admin/menu/:id/toggle-availability', authenticateAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const item = dbHelpers.toggleMenuItemAvailability(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    broadcastEvent('MENU_UPDATED', { action: 'TOGGLE_AVAILABILITY', item });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/menu/:id', authenticateAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    dbHelpers.deleteMenuItem(id);
    broadcastEvent('MENU_UPDATED', { action: 'DELETE', id });
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Upload Food Image
app.post('/api/admin/upload', authenticateAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      imageUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate QR Code Endpoint
app.get('/api/admin/qr', async (req, res) => {
  try {
    const host = req.get('host');
    const protocol = req.protocol;
    const defaultUrl = `${protocol}://${host}/`;
    const targetUrl = req.query.url || defaultUrl;

    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });

    res.json({
      targetUrl,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Printable Bill Data
app.get('/api/admin/bill/:orderNumber', (req, res) => {
  try {
    const orderNumber = parseInt(req.params.orderNumber, 10);
    const order = dbHelpers.getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const settings = dbHelpers.getShopSettings();
    res.json({
      shop: {
        name: settings.shop_name,
        tagline: settings.tagline,
        location: settings.location,
        slogan: settings.slogan,
        tamilName: settings.tamil_name
      },
      order
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback for client routing
app.use((req, res) => {
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SIVA'S FAST FOOD</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; background: #FAF7F2; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 480px; }
          h1 { color: #dc2626; margin: 0 0 0.5rem; font-size: 1.8rem; }
          p { color: #555; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>SIVA'S FAST FOOD</h1>
          <p><strong>FAST • FRESH • FIERY</strong></p>
          <p>Backend API is active on port ${PORT}. Client frontend build is compiling...</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  SIVA'S FAST FOOD BACKEND RUNNING ON http://localhost:${PORT}`);
  console.log(`  TAGLINE: "FAST • FRESH • FIERY"`);
  console.log(`  DEFAULT OWNER LOGIN: admin / siva123`);
  console.log(`=======================================================`);
});
