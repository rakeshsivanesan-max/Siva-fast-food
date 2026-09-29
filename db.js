const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// =========================================================
// DATABASE LOCATION
// =========================================================

const dataDir = process.env.VERCEL
  ? '/tmp/siva-fast-food-data'
  : path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sivas_fast_food.db');

const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');

if (!process.env.VERCEL) {
  db.exec('PRAGMA journal_mode = WAL;');
}

// =========================================================
// DATABASE INITIALIZATION
// =========================================================

function initDatabase() {
  // -------------------------------------------------------
  // SHOP SETTINGS
  // -------------------------------------------------------

  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT DEFAULT 'SIVA''S FAST FOOD',
      tagline TEXT DEFAULT 'FAST • FRESH • FIERY',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      is_open INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // -------------------------------------------------------
  // ADMIN USERS
  // -------------------------------------------------------

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // -------------------------------------------------------
  // MENU ITEMS
  // -------------------------------------------------------

  db.exec(`
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
  `);

  // -------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT,
      order_type TEXT DEFAULT 'takeaway',
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'pending',
      subtotal REAL DEFAULT 0,
      delivery_charge REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // -------------------------------------------------------
  // ORDER ITEMS
  // -------------------------------------------------------

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
        ON DELETE CASCADE
    );
  `);

  // -------------------------------------------------------
  // DEFAULT SHOP SETTINGS
  // -------------------------------------------------------

  const settings = db.prepare(`
    SELECT id
    FROM shop_settings
    WHERE id = 1
  `).get();

  if (!settings) {
    db.prepare(`
      INSERT INTO shop_settings
      (id, shop_name, tagline, phone, address, whatsapp, is_open)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).run(
      "SIVA'S FAST FOOD",
      'FAST • FRESH • FIERY',
      '',
      '',
      '',
      1
    );
  }

  // -------------------------------------------------------
  // DEFAULT ADMIN
  // -------------------------------------------------------

  const admin = db.prepare(`
    SELECT id
    FROM admin_users
    LIMIT 1
  `).get();

  if (!admin) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO admin_users
      (username, password_hash)
      VALUES (?, ?)
    `).run(username, passwordHash);

    console.log(`[DB] Default admin created: ${username}`);
  }

  // -------------------------------------------------------
  // SYNCHRONIZE CURRENT MENU
  // -------------------------------------------------------

  syncMenuItems();

  console.log('[DB] Database initialized successfully.');
}

// =========================================================
// MENU SYNCHRONIZATION
// =========================================================

function syncMenuItems() {
  const insert = db.prepare(`
    INSERT INTO menu_items
    (
      name,
      category,
      price,
      image_url,
      description,
      is_veg,
      available,
      badge,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const update = db.prepare(`
    UPDATE menu_items
    SET
      category = ?,
      price = ?,
      image_url = ?,
      description = ?,
      is_veg = ?,
      available = 1,
      badge = ?,
      sort_order = ?
    WHERE name = ?
  `);

  // -------------------------------------------------------
  // IMPORTANT:
  // Do not delete old menu rows because existing orders may
  // contain references to their menu_item_id.
  //
  // Make all existing items unavailable first.
  // Then enable/update only the current menu.
  // -------------------------------------------------------

  db.prepare(`
    UPDATE menu_items
    SET available = 0
  `).run();

  const menuItems = [

    // =====================================================
    // MAGGI
    // =====================================================

    {
      name: 'Plain Maggi',
      category: 'Maggi',
      price: 40,
      image_url: '',
      description: 'Classic plain Maggi.',
      is_veg: 1,
      badge: '',
      sort_order: 1
    },
    {
      name: 'Masala Maggi',
      category: 'Maggi',
      price: 50,
      image_url: '',
      description: 'Spicy masala Maggi.',
      is_veg: 1,
      badge: '',
      sort_order: 2
    },
    {
      name: 'Egg Maggi',
      category: 'Maggi',
      price: 60,
      image_url: '',
      description: 'Maggi with egg.',
      is_veg: 0,
      badge: '',
      sort_order: 3
    },
    {
      name: 'Schezwan Maggi',
      category: 'Maggi',
      price: 60,
      image_url: '',
      description: 'Spicy Schezwan Maggi.',
      is_veg: 1,
      badge: '',
      sort_order: 4
    },
    {
      name: 'Chicken Maggi',
      category: 'Maggi',
      price: 80,
      image_url: '',
      description: 'Maggi with chicken.',
      is_veg: 0,
      badge: '',
      sort_order: 5
    },

    // =====================================================
    // BREAD OMELETTE
    // =====================================================

    {
      name: 'Bread Omelette',
      category: 'Bread Omelette',
      price: 40,
      image_url: '',
      description: 'Classic bread omelette.',
      is_veg: 0,
      badge: '',
      sort_order: 10
    },
    {
      name: 'Double Egg Bread Omelette',
      category: 'Bread Omelette',
      price: 50,
      image_url: '',
      description: 'Bread omelette with double egg.',
      is_veg: 0,
      badge: '',
      sort_order: 11
    },
    {
      name: 'Masala Bread Omelette',
      category: 'Bread Omelette',
      price: 50,
      image_url: '',
      description: 'Masala bread omelette.',
      is_veg: 0,
      badge: '',
      sort_order: 12
    },
    {
      name: 'Cheese Bread Omelette',
      category: 'Bread Omelette',
      price: 70,
      image_url: '',
      description: 'Bread omelette with cheese.',
      is_veg: 0,
      badge: '',
      sort_order: 13
    },
    {
      name: 'Chicken Bread Omelette',
      category: 'Bread Omelette',
      price: 80,
      image_url: '',
      description: 'Bread omelette with chicken.',
      is_veg: 0,
      badge: '',
      sort_order: 14
    },

    // =====================================================
    // MOJITOS
    // =====================================================

    {
      name: 'Lemon Mojito',
      category: 'Mojitos',
      price: 50,
      image_url: '',
      description: 'Refreshing lemon mojito.',
      is_veg: 1,
      badge: '',
      sort_order: 20
    },
    {
      name: 'Mint Mojito',
      category: 'Mojitos',
      price: 50,
      image_url: '',
      description: 'Refreshing mint mojito.',
      is_veg: 1,
      badge: '',
      sort_order: 21
    },
    {
      name: 'Strawberry Mojito',
      category: 'Mojitos',
      price: 60,
      image_url: '',
      description: 'Refreshing strawberry mojito.',
      is_veg: 1,
      badge: '',
      sort_order: 22
    },
    {
      name: 'Mango Mojito',
      category: 'Mojitos',
      price: 60,
      image_url: '',
      description: 'Refreshing mango mojito.',
      is_veg: 1,
      badge: '',
      sort_order: 23
    },
    {
      name: 'Student Combo',
      category: 'Mojitos',
      price: 100,
      image_url: '',
      description: 'Any 2 Mojitos.',
      is_veg: 1,
      badge: 'ANY 2',
      sort_order: 24
    },

    // =====================================================
    // MOMO'S
    // =====================================================

    {
      name: 'Veg Momo (6 pcs)',
      category: "Momo's",
      price: 60,
      image_url: '',
      description: '6 pieces vegetable momos.',
      is_veg: 1,
      badge: '6 PCS',
      sort_order: 30
    },
    {
      name: 'Chicken Momo (6 pcs)',
      category: "Momo's",
      price: 80,
      image_url: '',
      description: '6 pieces chicken momos.',
      is_veg: 0,
      badge: '6 PCS',
      sort_order: 31
    },
    {
      name: 'Fried Momo Veg (6 pcs)',
      category: "Momo's",
      price: 80,
      image_url: '',
      description: '6 pieces fried vegetable momos.',
      is_veg: 1,
      badge: '6 PCS',
      sort_order: 32
    },
    {
      name: 'Fried Momo Chicken (6 pcs)',
      category: "Momo's",
      price: 100,
      image_url: '',
      description: '6 pieces fried chicken momos.',
      is_veg: 0,
      badge: '6 PCS',
      sort_order: 33
    },

    // =====================================================
    // FRIED CHICKEN
    // =====================================================

    {
      name: '1 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 50,
      image_url: '',
      description: 'Classic fried chicken.',
      is_veg: 0,
      badge: '1 PC',
      sort_order: 40
    },
    {
      name: '2 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 90,
      image_url: '',
      description: 'Classic fried chicken.',
      is_veg: 0,
      badge: '2 PCS',
      sort_order: 41
    },
    {
      name: '3 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 130,
      image_url: '',
      description: 'Classic fried chicken.',
      is_veg: 0,
      badge: '3 PCS',
      sort_order: 42
    },
    {
      name: '4 Pc Fried Chicken',
      category: 'Fried Chicken',
      price: 170,
      image_url: '',
      description: 'Classic fried chicken.',
      is_veg: 0,
      badge: '4 PCS',
      sort_order: 43
    },
    {
      name: 'Chicken Popcorn',
      category: 'Fried Chicken',
      price: 70,
      image_url: '',
      description: 'Crispy chicken popcorn.',
      is_veg: 0,
      badge: '',
      sort_order: 44
    },
    {
      name: 'Chicken Strips',
      category: 'Fried Chicken',
      price: 80,
      image_url: '',
      description: 'Crispy chicken strips.',
      is_veg: 0,
      badge: '',
      sort_order: 45
    },
    {
      name: 'Chicken Nuggets',
      category: 'Fried Chicken',
      price: 60,
      image_url: '',
      description: 'Crispy chicken nuggets.',
      is_veg: 0,
      badge: '',
      sort_order: 46
    },

    // =====================================================
    // FRIED RICE
    // =====================================================

    {
      name: 'Veg Fried Rice',
      category: 'Fried Rice',
      price: 80,
      image_url: '',
      description: 'Vegetable fried rice.',
      is_veg: 1,
      badge: '',
      sort_order: 50
    },
    {
      name: 'Schezwan Veg Fried Rice',
      category: 'Fried Rice',
      price: 90,
      image_url: '',
      description: 'Spicy Schezwan vegetable fried rice.',
      is_veg: 1,
      badge: '',
      sort_order: 51
    },
    {
      name: 'Egg Fried Rice',
      category: 'Fried Rice',
      price: 100,
      image_url: '',
      description: 'Egg fried rice.',
      is_veg: 0,
      badge: '',
      sort_order: 52
    },
    {
      name: 'Mushroom Fried Rice',
      category: 'Fried Rice',
      price: 100,
      image_url: '',
      description: 'Mushroom fried rice.',
      is_veg: 1,
      badge: '',
      sort_order: 53
    },
    {
      name: 'Paneer Fried Rice',
      category: 'Fried Rice',
      price: 110,
      image_url: '',
      description: 'Paneer fried rice.',
      is_veg: 1,
      badge: '',
      sort_order: 54
    },
    {
      name: 'Schezwan Egg Fried Rice',
      category: 'Fried Rice',
      price: 110,
      image_url: '',
      description: 'Spicy Schezwan egg fried rice.',
      is_veg: 0,
      badge: '',
      sort_order: 55
    },
    {
      name: 'Chicken Fried Rice',
      category: 'Fried Rice',
      price: 120,
      image_url: '',
      description: 'Chicken fried rice.',
      is_veg: 0,
      badge: '',
      sort_order: 56
    },
    {
      name: 'Schezwan Chicken Fried Rice',
      category: 'Fried Rice',
      price: 120,
      image_url: '',
      description: 'Spicy Schezwan chicken fried rice.',
      is_veg: 0,
      badge: '',
      sort_order: 57
    },

    // =====================================================
    // NOODLES
    // =====================================================

    {
      name: 'Veg Noodles',
      category: 'Noodles',
      price: 80,
      image_url: '',
      description: 'Vegetable noodles.',
      is_veg: 1,
      badge: '',
      sort_order: 60
    },
    {
      name: 'Schezwan Veg Noodles',
      category: 'Noodles',
      price: 90,
      image_url: '',
      description: 'Spicy Schezwan vegetable noodles.',
      is_veg: 1,
      badge: '',
      sort_order: 61
    },
    {
      name: 'Egg Noodles',
      category: 'Noodles',
      price: 100,
      image_url: '',
      description: 'Egg noodles.',
      is_veg: 0,
      badge: '',
      sort_order: 62
    },
    {
      name: 'Mushroom Noodles',
      category: 'Noodles',
      price: 100,
      image_url: '',
      description: 'Mushroom noodles.',
      is_veg: 1,
      badge: '',
      sort_order: 63
    },
    {
      name: 'Chilli Garlic Noodles',
      category: 'Noodles',
      price: 100,
      image_url: '',
      description: 'Chilli garlic noodles.',
      is_veg: 1,
      badge: '',
      sort_order: 64
    },
    {
      name: 'Schezwan Egg Noodles',
      category: 'Noodles',
      price: 110,
      image_url: '',
      description: 'Spicy Schezwan egg noodles.',
      is_veg: 0,
      badge: '',
      sort_order: 65
    },
    {
      name: 'Chicken Noodles',
      category: 'Noodles',
      price: 110,
      image_url: '',
      description: 'Chicken noodles.',
      is_veg: 0,
      badge: '',
      sort_order: 66
    },
    {
      name: 'Schezwan Chicken Noodles',
      category: 'Noodles',
      price: 120,
      image_url: '',
      description: 'Spicy Schezwan chicken noodles.',
      is_veg: 0,
      badge: '',
      sort_order: 67
    },

    // =====================================================
    // STARTERS
    // =====================================================

    {
      name: 'Gobi Manchurian',
      category: 'Starters',
      price: 85,
      image_url: '',
      description: 'Crispy Gobi Manchurian.',
      is_veg: 1,
      badge: '',
      sort_order: 70
    },
    {
      name: 'Chilli Gobi',
      category: 'Starters',
      price: 90,
      image_url: '',
      description: 'Spicy chilli gobi.',
      is_veg: 1,
      badge: '',
      sort_order: 71
    },
    {
      name: 'Chilli Chicken Dry',
      category: 'Starters',
      price: 100,
      image_url: '',
      description: 'Dry chilli chicken.',
      is_veg: 0,
      badge: '',
      sort_order: 72
    },
    {
      name: 'Chicken Manchurian',
      category: 'Starters',
      price: 110,
      image_url: '',
      description: 'Chicken Manchurian.',
      is_veg: 0,
      badge: '',
      sort_order: 73
    },

    // =====================================================
    // BEVERAGES
    // =====================================================

    {
      name: 'Water Bottle',
      category: 'Beverages',
      price: 20,
      image_url: '',
      description: 'Packaged drinking water.',
      is_veg: 1,
      badge: '',
      sort_order: 80
    },
    {
      name: 'Soft Drinks',
      category: 'Beverages',
      price: 0,
      image_url: '',
      description: 'Soft drinks - MRP.',
      is_veg: 1,
      badge: 'MRP',
      sort_order: 81
    }
  ];

  for (const item of menuItems) {
    const existing = db.prepare(`
      SELECT id
      FROM menu_items
      WHERE name = ?
      LIMIT 1
    `).get(item.name);

    if (existing) {
      update.run(
        item.category,
        item.price,
        item.image_url,
        item.description,
        item.is_veg,
        item.badge,
        item.sort_order,
        item.name
      );
    } else {
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
  }

  console.log(
    `[DB] Menu synchronized successfully: ${menuItems.length} current items.`
  );
}

// =========================================================
// SHOP SETTINGS HELPERS
// =========================================================

function getShopSettings() {
  return db.prepare(`
    SELECT *
    FROM shop_settings
    WHERE id = 1
  `).get();
}

function updateShopSettings(settings) {
  const current = getShopSettings();

  const shopName =
    settings.shop_name !== undefined
      ? settings.shop_name
      : current.shop_name;

  const tagline =
    settings.tagline !== undefined
      ? settings.tagline
      : current.tagline;

  const phone =
    settings.phone !== undefined
      ? settings.phone
      : current.phone;

  const address =
    settings.address !== undefined
      ? settings.address
      : current.address;

  const whatsapp =
    settings.whatsapp !== undefined
      ? settings.whatsapp
      : current.whatsapp;

  const isOpen =
    settings.is_open !== undefined
      ? Number(settings.is_open)
      : current.is_open;

  db.prepare(`
    UPDATE shop_settings
    SET
      shop_name = ?,
      tagline = ?,
      phone = ?,
      address = ?,
      whatsapp = ?,
      is_open = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    shopName,
    tagline,
    phone,
    address,
    whatsapp,
    isOpen
  );

  return getShopSettings();
}

// =========================================================
// ADMIN HELPERS
// =========================================================

function getAdminByUsername(username) {
  return db.prepare(`
    SELECT *
    FROM admin_users
    WHERE username = ?
    LIMIT 1
  `).get(username);
}

function verifyAdminPassword(username, password) {
  const admin = getAdminByUsername(username);

  if (!admin) {
    return null;
  }

  const valid = bcrypt.compareSync(
    password,
    admin.password_hash
  );

  if (!valid) {
    return null;
  }

  return {
    id: admin.id,
    username: admin.username
  };
}

function createAdmin(username, password) {
  const passwordHash = bcrypt.hashSync(password, 10);

  return db.prepare(`
    INSERT INTO admin_users
    (username, password_hash)
    VALUES (?, ?)
  `).run(username, passwordHash);
}

function updateAdminCredentials(
  currentUsername,
  currentPassword,
  newUsername,
  newPassword
) {
  const admin = getAdminByUsername(currentUsername);

  if (!admin) {
    throw new Error('Current username is incorrect');
  }

  const valid = bcrypt.compareSync(
    currentPassword,
    admin.password_hash
  );

  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  const username =
    newUsername && newUsername.trim()
      ? newUsername.trim()
      : currentUsername;

  const passwordHash =
    newPassword && newPassword.trim()
      ? bcrypt.hashSync(newPassword, 10)
      : admin.password_hash;

  db.prepare(`
    UPDATE admin_users
    SET
      username = ?,
      password_hash = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    username,
    passwordHash,
    admin.id
  );

  return {
    id: admin.id,
    username
  };
}

// =========================================================
// MENU HELPERS
// =========================================================

function getAllMenuItems(onlyAvailable = false) {
  if (onlyAvailable) {
    return db.prepare(`
      SELECT *
      FROM menu_items
      WHERE available = 1
      ORDER BY sort_order ASC, id ASC
    `).all();
  }

  return db.prepare(`
    SELECT *
    FROM menu_items
    ORDER BY sort_order ASC, id ASC
  `).all();
}

function getMenuItemById(id) {
  return db.prepare(`
    SELECT *
    FROM menu_items
    WHERE id = ?
    LIMIT 1
  `).get(Number(id));
}

function addMenuItem(item) {
  const result = db.prepare(`
    INSERT INTO menu_items
    (
      name,
      category,
      price,
      image_url,
      description,
      is_veg,
      available,
      badge,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.name,
    item.category,
    Number(item.price || 0),
    item.image_url || '',
    item.description || '',
    Number(item.is_veg || 0),
    item.available === undefined
      ? 1
      : Number(item.available),
    item.badge || '',
    Number(item.sort_order || 0)
  );

  return getMenuItemById(result.lastInsertRowid);
}

function updateMenuItem(id, item) {
  const existing = getMenuItemById(id);

  if (!existing) {
    throw new Error('Menu item not found');
  }

  const name =
    item.name !== undefined ? item.name : existing.name;

  const category =
    item.category !== undefined
      ? item.category
      : existing.category;

  const price =
    item.price !== undefined
      ? Number(item.price)
      : existing.price;

  const imageUrl =
    item.image_url !== undefined
      ? item.image_url
      : existing.image_url;

  const description =
    item.description !== undefined
      ? item.description
      : existing.description;

  const isVeg =
    item.is_veg !== undefined
      ? Number(item.is_veg)
      : existing.is_veg;

  const available =
    item.available !== undefined
      ? Number(item.available)
      : existing.available;

  const badge =
    item.badge !== undefined
      ? item.badge
      : existing.badge;

  const sortOrder =
    item.sort_order !== undefined
      ? Number(item.sort_order)
      : existing.sort_order;

  db.prepare(`
    UPDATE menu_items
    SET
      name = ?,
      category = ?,
      price = ?,
      image_url = ?,
      description = ?,
      is_veg = ?,
      available = ?,
      badge = ?,
      sort_order = ?
    WHERE id = ?
  `).run(
    name,
    category,
    price,
    imageUrl,
    description,
    isVeg,
    available,
    badge,
    sortOrder,
    Number(id)
  );

  return getMenuItemById(id);
}

function toggleMenuItemAvailability(id) {
  const item = getMenuItemById(id);

  if (!item) {
    throw new Error('Menu item not found');
  }

  const newAvailability = item.available ? 0 : 1;

  db.prepare(`
    UPDATE menu_items
    SET available = ?
    WHERE id = ?
  `).run(
    newAvailability,
    Number(id)
  );

  return getMenuItemById(id);
}

function deleteMenuItem(id) {
  const item = getMenuItemById(id);

  if (!item) {
    throw new Error('Menu item not found');
  }

  // Do NOT delete if an existing order references this item.
  // Instead make it unavailable.
  const orderItem = db.prepare(`
    SELECT id
    FROM order_items
    WHERE menu_item_id = ?
    LIMIT 1
  `).get(Number(id));

  if (orderItem) {
    db.prepare(`
      UPDATE menu_items
      SET available = 0
      WHERE id = ?
    `).run(Number(id));

    return {
      success: true,
      message: 'Menu item has existing orders, so it was disabled instead of deleted.',
      item: getMenuItemById(id)
    };
  }

  db.prepare(`
    DELETE FROM menu_items
    WHERE id = ?
  `).run(Number(id));

  return {
    success: true,
    message: 'Menu item deleted successfully.'
  };
}

// =========================================================
// ORDER HELPERS
// =========================================================

function generateOrderNumber() {
  const now = new Date();

  const date =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `SFF-${date}-${random}`;
}

function createOrder(orderData) {
  const items = Array.isArray(orderData.items)
    ? orderData.items
    : [];

  if (items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  let subtotal = 0;
  const processedItems = [];

  for (const item of items) {
    const menuItemId = Number(
      item.menu_item_id ||
      item.menuItemId ||
      item.id
    );

    const quantity = Math.max(
      1,
      Number(item.quantity || 1)
    );

    const menuItem = getMenuItemById(menuItemId);

    if (!menuItem) {
      throw new Error(
        `Menu item not found: ${menuItemId}`
      );
    }

    if (!menuItem.available) {
      throw new Error(
        `${menuItem.name} is currently unavailable`
      );
    }

    const price = Number(menuItem.price);
    const itemTotal = price * quantity;

    subtotal += itemTotal;

    processedItems.push({
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      quantity,
      price,
      total: itemTotal
    });
  }

  const deliveryCharge = Number(
    orderData.delivery_charge || 0
  );

  const total = subtotal + deliveryCharge;

  const orderNumber = generateOrderNumber();

  const transaction = db.transaction(() => {
    const orderResult = db.prepare(`
      INSERT INTO orders
      (
        order_number,
        customer_name,
        customer_phone,
        customer_address,
        order_type,
        payment_method,
        payment_status,
        order_status,
        subtotal,
        delivery_charge,
        total,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber,
      orderData.customer_name ||
        orderData.customerName ||
        '',
      orderData.customer_phone ||
        orderData.customerPhone ||
        '',
      orderData.customer_address ||
        orderData.customerAddress ||
        '',
      orderData.order_type ||
        orderData.orderType ||
        'takeaway',
      orderData.payment_method ||
        orderData.paymentMethod ||
        'cash',
      orderData.payment_status || 'pending',
      orderData.order_status || 'pending',
      subtotal,
      deliveryCharge,
      total,
      orderData.notes || ''
    );

    const orderId = Number(
      orderResult.lastInsertRowid
    );

    const itemInsert = db.prepare(`
      INSERT INTO order_items
      (
        order_id,
        menu_item_id,
        item_name,
        quantity,
        price,
        total
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      itemInsert.run(
        orderId,
        item.menu_item_id,
        item.item_name,
        item.quantity,
        item.price,
        item.total
      );
    }

    return orderId;
  });

  const orderId = transaction();

  return getOrderById(orderId);
}

function getOrderById(id) {
  const order = db.prepare(`
    SELECT *
    FROM orders
    WHERE id = ?
    LIMIT 1
  `).get(Number(id));

  if (!order) {
    return null;
  }

  const items = db.prepare(`
    SELECT *
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `).all(Number(id));

  return {
    ...order,
    items
  };
}

function getOrderByNumber(orderNumber) {
  const order = db.prepare(`
    SELECT *
    FROM orders
    WHERE order_number = ?
    LIMIT 1
  `).get(orderNumber);

  if (!order) {
    return null;
  }

  const items = db.prepare(`
    SELECT *
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `).all(order.id);

  return {
    ...order,
    items
  };
}

function getOrders(options = {}) {
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(options.limit || 100)
    )
  );

  const offset = Math.max(
    0,
    Number(options.offset || 0)
  );

  let query = `
    SELECT *
    FROM orders
  `;

  const params = [];

  if (options.status) {
    query += `
      WHERE order_status = ?
    `;

    params.push(options.status);
  }

  query += `
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const orders = db.prepare(query).all(...params);

  for (const order of orders) {
    order.items = db.prepare(`
      SELECT *
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
    `).all(order.id);
  }

  return orders;
}

function updateOrderStatus(
  orderId,
  status
) {
  const allowedStatuses = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled'
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid order status: ${status}`
    );
  }

  db.prepare(`
    UPDATE orders
    SET
      order_status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    status,
    Number(orderId)
  );

  return getOrderById(orderId);
}

// =========================================================
// STATISTICS
// =========================================================

function getStats() {
  const totalOrders = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
  `).get().count;

  const pendingOrders = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
    WHERE order_status = 'pending'
  `).get().count;

  const completedOrders = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
    WHERE order_status = 'completed'
  `).get().count;

  const cancelledOrders = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
    WHERE order_status = 'cancelled'
  `).get().count;

  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(total), 0) AS total
    FROM orders
    WHERE order_status != 'cancelled'
  `).get().total;

  const todayRevenue = db.prepare(`
    SELECT COALESCE(SUM(total), 0) AS total
    FROM orders
    WHERE DATE(created_at) = DATE('now', 'localtime')
      AND order_status != 'cancelled'
  `).get().total;

  const todayOrders = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
    WHERE DATE(created_at) = DATE('now', 'localtime')
  `).get().count;

  return {
    totalOrders: Number(totalOrders || 0),
    pendingOrders: Number(pendingOrders || 0),
    completedOrders: Number(completedOrders || 0),
    cancelledOrders: Number(cancelledOrders || 0),
    totalRevenue: Number(totalRevenue || 0),
    todayRevenue: Number(todayRevenue || 0),
    todayOrders: Number(todayOrders || 0)
  };
}

// =========================================================
// ALL DATABASE HELPERS
// =========================================================

const dbHelpers = {
  // Shop
  getShopSettings,
  updateShopSettings,

  // Admin
  getAdminByUsername,
  verifyAdminPassword,
  createAdmin,
  updateAdminCredentials,

  // Menu
  getAllMenuItems,
  getMenuItemById,
  addMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  syncMenuItems,

  // Orders
  createOrder,
  getOrderById,
  getOrderByNumber,
  getOrders,
  updateOrderStatus,

  // Statistics
  getStats
};

// =========================================================
// INITIALIZE DATABASE
// =========================================================

initDatabase();

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  db,
  dbHelpers
};