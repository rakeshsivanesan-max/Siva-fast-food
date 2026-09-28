const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
// Use a writable temporary directory on Vercel,
// while keeping the normal data directory locally.
const dataDir = process.env.VERCEL
  ? '/tmp/siva-fast-food-data'
  : path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sivas_fast_food.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// WAL can cause problems on some serverless filesystems,
// so only enable it for local development.
if (!process.env.VERCEL) {
  db.exec('PRAGMA journal_mode = WAL;');
}

// Initialize tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT,
      description TEXT,
      is_veg INTEGER DEFAULT 0,
      available INTEGER DEFAULT 1,
      badge TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number INTEGER NOT NULL UNIQUE,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      customer_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);
  `);

  // Default settings
  const settings = [
    ['shop_name', "SIVA'S FAST FOOD"],
    ['tagline', 'FAST • FRESH • FIERY'],
    ['subtitle', 'Tasty Affordable Always'],
    ['location', 'Ramakrishnapuram, Srivilliputhur'],
    ['slogan', 'Good Food • Great Mood'],
    ['tamil_name', 'சிவாஸ் பாஸ்ட் ஃபுட்'],
    ['next_order_number', '101']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO shop_settings (key, value) VALUES (?, ?)
  `);
  for (const [k, v] of settings) {
    insertSetting.run(k, v);
  }

  // Create default owner / admin if not exists
  const checkAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('sivaowner');
if (!checkAdmin) {
  const defaultPasswordHash = bcrypt.hashSync('Siva@2026', 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('sivaowner', defaultPasswordHash);
  console.log('[DB] Created default admin user: "sivaowner"');
}

  // Seed Menu Items from the actual uploaded menu image if empty
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get().count;
  if (itemCount === 0) {
    seedMenuItems();
  }
}

function seedMenuItems() {
  const insert = db.prepare(`
    INSERT INTO menu_items (name, category, price, image_url, description, is_veg, available, badge, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialItems = [
    // --- OMELETTE ---
    {
      name: 'Plain Omelette',
      category: 'Omelette',
      price: 40,
      image_url: '/assets/dish_omelette.png',
      description: 'Hot fluffy single egg omelette seasoned with onions, green chillies & ground pepper.',
      is_veg: 0,
      badge: 'Classic',
      sort_order: 1
    },
    {
      name: 'Bread Omelette',
      category: 'Omelette',
      price: 50,
      image_url: '/assets/dish_omelette.png',
      description: 'Golden spiced fluffy omelette wrapped around toasted fresh bread slices.',
      is_veg: 0,
      badge: 'Popular',
      sort_order: 2
    },
    {
      name: 'Cheese Omelette',
      category: 'Omelette',
      price: 50,
      image_url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&auto=format&fit=crop&q=80',
      description: 'Gooey melted cheese folded into a freshly whisked spicy masala omelette.',
      is_veg: 0,
      badge: 'Cheesy',
      sort_order: 3
    },
    {
      name: 'Chicken Omelette',
      category: 'Omelette',
      price: 70,
      image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
      description: 'Loaded with juicy shredded spiced chicken chunks and aromatic herbs.',
      is_veg: 0,
      badge: 'Fiery',
      sort_order: 4
    },
    {
      name: 'Special Omelette',
      category: 'Omelette',
      price: 80,
      image_url: '/assets/dish_omelette.png',
      description: "Siva's signature loaded omelette with extra eggs, cheese and fiery spices.",
      is_veg: 0,
      badge: "Chef's Special",
      sort_order: 5
    },

    // --- MOJITOS ---
    {
      name: 'Lemon Mojito',
      category: 'Mojitos',
      price: 50,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
      description: 'Zesty fresh lemon juice, crushed mint sprigs, lime wedge & ice-cold sparkling fizz.',
      is_veg: 1,
      badge: 'Refreshing',
      sort_order: 10
    },
    {
      name: 'Mint Mojito',
      category: 'Mojitos',
      price: 50,
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
      description: 'Double garden-fresh crushed mint leaves with chilled sparkling soda and cane sugar.',
      is_veg: 1,
      badge: 'Chilled',
      sort_order: 11
    },
    {
      name: 'Strawberry Mojito',
      category: 'Mojitos',
      price: 60,
      image_url: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=600&auto=format&fit=crop&q=80',
      description: 'Luscious ripe strawberry crush, fresh lime, mint leaves and bubbly soda.',
      is_veg: 1,
      badge: 'Fruity',
      sort_order: 12
    },
    {
      name: 'Mango Mojito',
      category: 'Mojitos',
      price: 60,
      image_url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80',
      description: 'Sweet tropical Alphonso mango pulp blended with mint and sparkling soda.',
      is_veg: 1,
      badge: 'Sweet & Fizzy',
      sort_order: 13
    },
    {
      name: 'Student Combo (Any 2 Mojitos)',
      category: 'Mojitos',
      price: 100,
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
      description: 'Special Student Deal! Choose any 2 refreshing mojitos of your choice.',
      is_veg: 1,
      badge: 'Student Combo ₹100',
      sort_order: 14
    },

    // --- FRIED CHICKEN ---
    {
      name: '1 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 50,
      image_url: '/assets/dish_chicken.png',
      description: '1 Piece golden crispy fried chicken with secret spice rub and garlic dip.',
      is_veg: 0,
      badge: 'Crispy & Juicy',
      sort_order: 20
    },
    {
      name: '2 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 90,
      image_url: '/assets/dish_chicken.png',
      description: '2 Pieces golden crunchy fried chicken with dip.',
      is_veg: 0,
      badge: 'Crispy & Juicy',
      sort_order: 21
    },
    {
      name: '3 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 130,
      image_url: '/assets/dish_chicken.png',
      description: '3 Pieces hot, juicy seasoned fried chicken drumsticks & thighs.',
      is_veg: 0,
      badge: 'Crispy & Juicy',
      sort_order: 22
    },
    {
      name: '4 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 170,
      image_url: '/assets/dish_chicken.png',
      description: '4 Pieces full fried chicken feast with complimentary creamy dips.',
      is_veg: 0,
      badge: 'Best Value',
      sort_order: 23
    },
    {
      name: 'Chicken Popcorn',
      category: 'Fried Chicken',
      price: 70,
      image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
      description: 'Crunchy bite-sized chicken pops seasoned with spicy pepper blend.',
      is_veg: 0,
      badge: 'Snack Attack',
      sort_order: 24
    },
    {
      name: 'Chicken Strips',
      category: 'Fried Chicken',
      price: 80,
      image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80',
      description: 'Tender boneless chicken tender strips crusted in crispy golden breading.',
      is_veg: 0,
      badge: 'Boneless',
      sort_order: 25
    },
    {
      name: 'Chicken Nuggets',
      category: 'Fried Chicken',
      price: 60,
      image_url: 'https://images.unsplash.com/photo-1585325701165-351af916e581?w=600&auto=format&fit=crop&q=80',
      description: 'Crisp on the outside, juicy inside fried chicken nuggets with tangy sauce.',
      is_veg: 0,
      badge: 'Kids Favourite',
      sort_order: 26
    },

    // --- FRIED RICE ---
    {
      name: 'Veg Fried Rice',
      category: 'Fried Rice',
      price: 80,
      image_url: '/assets/dish_fried_rice.png',
      description: 'Long-grain basmati rice wok-tossed with fresh carrot, cabbage, beans & spring onions.',
      is_veg: 1,
      badge: 'Popular',
      sort_order: 30
    },
    {
      name: 'Schezwan Veg Fried Rice',
      category: 'Fried Rice',
      price: 90,
      image_url: '/assets/dish_fried_rice.png',
      description: 'Fiery street-style wok rice with spicy homemade red Schezwan chili paste.',
      is_veg: 1,
      badge: 'Spicy 🔥',
      sort_order: 31
    },
    {
      name: 'Egg Fried Rice',
      category: 'Fried Rice',
      price: 100,
      image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      description: 'Wok-charred rice tossed with fluffy scrambled eggs, pepper and soy.',
      is_veg: 0,
      badge: 'All-Time Hit',
      sort_order: 32
    },
    {
      name: 'Mushroom Fried Rice',
      category: 'Fried Rice',
      price: 100,
      image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80',
      description: 'Plump button mushrooms sauteed with aromatic garlic and seasoned basmati rice.',
      is_veg: 1,
      badge: 'Tasty',
      sort_order: 33
    },
    {
      name: 'Paneer Fried Rice',
      category: 'Fried Rice',
      price: 110,
      image_url: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600&auto=format&fit=crop&q=80',
      description: 'Soft golden cottage cheese cubes tossed with vegetables and spiced rice.',
      is_veg: 1,
      badge: 'Special',
      sort_order: 34
    },
    {
      name: 'Schezwan Egg Fried Rice',
      category: 'Fried Rice',
      price: 110,
      image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      description: 'Fluffy eggs wok-tossed in bold Schezwan sauce with fragrant fried rice.',
      is_veg: 0,
      badge: 'Spicy 🔥',
      sort_order: 35
    },
    {
      name: 'Chicken Fried Rice',
      category: 'Fried Rice',
      price: 120,
      image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      description: 'Succulent fried chicken pieces tossed with high-heat wok basmati rice.',
      is_veg: 0,
      badge: 'Bestseller',
      sort_order: 36
    },
    {
      name: 'Schezwan Chicken Fried Rice',
      category: 'Fried Rice',
      price: 120,
      image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      description: 'The ultimate fiery fast-food favourite: Chicken chunks in hot Schezwan wok rice.',
      is_veg: 0,
      badge: 'Fiery 🔥',
      sort_order: 37
    },

    // --- MOMO'S ---
    {
      name: 'Veg Momo (6 pcs)',
      category: "Momo's",
      price: 60,
      image_url: '/assets/dish_momos.png',
      description: '6 pieces of soft steamed Tibetan-style momos stuffed with minced cabbage, carrots & spices.',
      is_veg: 1,
      badge: 'Steamed',
      sort_order: 40
    },
    {
      name: 'Chicken Momo (6 pcs)',
      category: "Momo's",
      price: 80,
      image_url: '/assets/dish_momos.png',
      description: '6 pieces of tender steamed momos packed with spiced juicy minced chicken.',
      is_veg: 0,
      badge: 'Steamed & Juicy',
      sort_order: 41
    },
    {
      name: 'Fried Momo Veg (6 pcs)',
      category: "Momo's",
      price: 80,
      image_url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&auto=format&fit=crop&q=80',
      description: '6 pieces golden deep-fried vegetable dumplings with fiery red chili dipping chutney.',
      is_veg: 1,
      badge: 'Crispy',
      sort_order: 42
    },
    {
      name: 'Fried Momo Chicken (6 pcs)',
      category: "Momo's",
      price: 100,
      image_url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&auto=format&fit=crop&q=80',
      description: '6 pieces extra crunchy deep-fried chicken momos served hot with spicy sauce.',
      is_veg: 0,
      badge: 'Crispy & Fiery',
      sort_order: 43
    },

    // --- NOODLES ---
    {
      name: 'Veg Noodles',
      category: 'Noodles',
      price: 80,
      image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
      description: 'Classic wok-tossed hakka noodles with crisp julienned vegetables and light soy.',
      is_veg: 1,
      badge: 'Classic',
      sort_order: 50
    },
    {
      name: 'Schezwan Veg Noodles',
      category: 'Noodles',
      price: 90,
      image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
      description: 'Spicy street noodles tossed in fiery red chili Schezwan paste and crunchy veggies.',
      is_veg: 1,
      badge: 'Spicy 🔥',
      sort_order: 51
    },
    {
      name: 'Egg Noodles',
      category: 'Noodles',
      price: 100,
      image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
      description: 'Street-style noodles scrambled with farm eggs, shredded cabbage and pepper.',
      is_veg: 0,
      badge: 'Popular',
      sort_order: 52
    },
    {
      name: 'Mushroom Noodles',
      category: 'Noodles',
      price: 100,
      image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
      description: 'Earthy button mushrooms stir-fried with hot wok noodles and spring garlic.',
      is_veg: 1,
      badge: 'Tasty',
      sort_order: 53
    },
    {
      name: 'Chilli Garlic Noodles',
      category: 'Noodles',
      price: 110,
      image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
      description: 'Bold toasted garlic and spicy crushed red chillies tossed with noodles.',
      is_veg: 1,
      badge: 'Aromatic & Spicy',
      sort_order: 54
    },
    {
      name: 'Schezwan Egg Noodles',
      category: 'Noodles',
      price: 110,
      image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
      description: 'Fluffy eggs tossed with long noodles in spicy house Schezwan seasoning.',
      is_veg: 0,
      badge: 'Spicy 🔥',
      sort_order: 55
    },
    {
      name: 'Chicken Noodles',
      category: 'Noodles',
      price: 120,
      image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
      description: 'Tender chicken strips and fresh vegetables wok-fried with savoury noodles.',
      is_veg: 0,
      badge: 'Bestseller',
      sort_order: 56
    },
    {
      name: 'Schezwan Chicken Noodles',
      category: 'Noodles',
      price: 120,
      image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
      description: 'Spicy chicken noodles infused with aromatic wok smoke and fiery Schezwan oil.',
      is_veg: 0,
      badge: 'Fiery 🔥',
      sort_order: 57
    }
  ];

  for (const item of initialItems) {
    insert.run(
      item.name,
      item.category,
      item.price,
      item.image_url,
      item.description,
      item.is_veg,
      1,
      item.badge,
      item.sort_order
    );
  }

  console.log(`[DB] Successfully seeded ${initialItems.length} menu items from SIVA'S FAST FOOD menu!`);
}

// Helper methods
const dbHelpers = {
  // Get next sequential order number (starts at 101)
  getNextOrderNumber() {
    const maxOrder = db.prepare('SELECT MAX(order_number) as max_num FROM orders').get();
    if (maxOrder && maxOrder.max_num) {
      return maxOrder.max_num + 1;
    }
    const setting = db.prepare("SELECT value FROM shop_settings WHERE key = 'next_order_number'").get();
    return setting ? parseInt(setting.value, 10) : 101;
  },

  getShopSettings() {
    const rows = db.prepare('SELECT key, value FROM shop_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  getAllMenuItems(onlyAvailable = false) {
    if (onlyAvailable) {
      return db.prepare('SELECT * FROM menu_items WHERE available = 1 ORDER BY sort_order ASC, id ASC').all();
    }
    return db.prepare('SELECT * FROM menu_items ORDER BY sort_order ASC, id ASC').all();
  },

  getMenuItemById(id) {
    return db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  },

  addMenuItem(item) {
    const stmt = db.prepare(`
      INSERT INTO menu_items (name, category, price, image_url, description, is_veg, available, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      item.name,
      item.category,
      parseFloat(item.price),
      item.image_url || '/assets/dish_chicken.png',
      item.description || '',
      item.is_veg ? 1 : 0,
      item.available !== undefined ? (item.available ? 1 : 0) : 1,
      item.badge || null,
      parseInt(item.sort_order || 0, 10)
    );
    return this.getMenuItemById(result.lastInsertRowid);
  },

  updateMenuItem(id, item) {
    const stmt = db.prepare(`
      UPDATE menu_items
      SET name = ?, category = ?, price = ?, image_url = ?, description = ?, is_veg = ?, available = ?, badge = ?, sort_order = ?
      WHERE id = ?
    `);
    stmt.run(
      item.name,
      item.category,
      parseFloat(item.price),
      item.image_url,
      item.description,
      item.is_veg ? 1 : 0,
      item.available ? 1 : 0,
      item.badge || null,
      parseInt(item.sort_order || 0, 10),
      id
    );
    return this.getMenuItemById(id);
  },

  toggleMenuItemAvailability(id) {
    const item = this.getMenuItemById(id);
    if (!item) return null;
    const newStatus = item.available === 1 ? 0 : 1;
    db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(newStatus, id);
    return this.getMenuItemById(id);
  },

  deleteMenuItem(id) {
    return db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  },

  createOrder(cartItems, customerNotes = '') {
    // SECURITY: Re-fetch current price from DB for every item, do NOT trust client price
    let totalAmount = 0;
    const verifiedItems = [];

    for (const ci of cartItems) {
      const dbItem = this.getMenuItemById(ci.menuItemId);
      if (!dbItem) {
        throw new Error(`Menu item ID ${ci.menuItemId} not found.`);
      }
      if (dbItem.available !== 1) {
        throw new Error(`"${dbItem.name}" is currently unavailable.`);
      }
      const qty = parseInt(ci.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for ${dbItem.name}`);
      }
      const unitPrice = parseFloat(dbItem.price);
      const subtotal = unitPrice * qty;
      totalAmount += subtotal;

      verifiedItems.push({
        menuItemId: dbItem.id,
        itemName: dbItem.name,
        quantity: qty,
        price: unitPrice,
        subtotal: subtotal
      });
    }

    if (verifiedItems.length === 0) {
      throw new Error('Cannot create an empty order.');
    }

    const orderNumber = this.getNextOrderNumber();

    // Insert order in transaction
    db.exec('BEGIN TRANSACTION;');
    try {
      const orderStmt = db.prepare(`
        INSERT INTO orders (order_number, total_amount, status, customer_notes, created_at, updated_at)
        VALUES (?, ?, 'NEW', ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const orderResult = orderStmt.run(orderNumber, totalAmount, customerNotes || '');
      const orderId = orderResult.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const vi of verifiedItems) {
        itemStmt.run(orderId, vi.menuItemId, vi.itemName, vi.quantity, vi.price, vi.subtotal);
      }

      db.exec('COMMIT;');
      return this.getOrderById(orderId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getOrderById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return { ...order, items };
  },

  getOrderByNumber(orderNumber) {
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  },

  updateOrderStatus(orderId, newStatus) {
    const validStatuses = ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newStatus, orderId);
    return this.getOrderById(orderId);
  },

  getOrders({ status, search, date, limit = 100 }) {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      const trimmed = search.trim();
      if (!isNaN(trimmed)) {
        query += ' AND order_number = ?';
        params.push(parseInt(trimmed, 10));
      } else {
        query += ` AND id IN (
          SELECT order_id FROM order_items WHERE item_name LIKE ?
        )`;
        params.push(`%${trimmed}%`);
      }
    }

    if (date) {
      query += " AND date(created_at) = date(?)";
      params.push(date);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const orders = db.prepare(query).all(...params);
    const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    return orders.map(ord => ({
      ...ord,
      items: itemStmt.all(ord.id)
    }));
  },

  getStats() {
    // Today's orders & sales
    const todayOrders = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END), 0) as new_orders,
        COALESCE(SUM(CASE WHEN status = 'PREPARING' THEN 1 ELSE 0 END), 0) as preparing_orders,
        COALESCE(SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END), 0) as ready_orders,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) as completed_orders
      FROM orders
      WHERE date(created_at) = date('now', 'localtime')
    `).get();

    // All time stats
    const allTime = db.prepare(`
      SELECT 
        COUNT(*) as all_time_orders,
        COALESCE(SUM(total_amount), 0) as all_time_sales
      FROM orders
    `).get();

    // Top selling items
    const topItems = db.prepare(`
      SELECT item_name, SUM(quantity) as total_sold, SUM(subtotal) as total_revenue
      FROM order_items
      GROUP BY item_name
      ORDER BY total_sold DESC
      LIMIT 5
    `).all();

    return {
      today: {
        orders: todayOrders.total_orders,
        sales: todayOrders.total_sales,
        pending: todayOrders.new_orders + todayOrders.preparing_orders,
        newCount: todayOrders.new_orders,
        preparingCount: todayOrders.preparing_orders,
        readyCount: todayOrders.ready_orders,
        completed: todayOrders.completed_orders
      },
      allTime: {
        orders: allTime.all_time_orders,
        sales: allTime.all_time_sales
      },
      topItems
    };
  }
};

// Initialize DB on require
initDatabase();

module.exports = {
  db,
  dbHelpers
};
