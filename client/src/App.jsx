import React, { useState, useEffect } from 'react';
import CustomerMenu from './components/CustomerMenu';
import CartDrawer from './components/CartDrawer';
import OrderConfirmation from './components/OrderConfirmation';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import BillModal from './components/BillModal';

export default function App() {
  // Navigation View: 'menu' | 'order_confirmation' | 'admin_login' | 'admin_dashboard'
  const [currentView, setCurrentView] = useState('menu');

  // Shop Info & Menu Data
  const [shopInfo, setShopInfo] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('siva_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Order State (for customer confirmation & tracking)
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('siva_active_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Admin Auth State
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('siva_admin_token') || null;
  });
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('siva_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Bill Receipt Modal State
  const [billModalOrder, setBillModalOrder] = useState(null);

  // Sync Cart to localStorage
  useEffect(() => {
    localStorage.setItem('siva_cart', JSON.stringify(cart));
  }, [cart]);

  // Sync Active Order to localStorage
  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('siva_active_order', JSON.stringify(activeOrder));
    }
  }, [activeOrder]);

  // Route parser on load / hash change
  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.includes('/admin') || hash.includes('#admin')) {
        if (adminToken) {
          setCurrentView('admin_dashboard');
        } else {
          setCurrentView('admin_login');
        }
      } else if (hash.includes('#order') && activeOrder) {
        setCurrentView('order_confirmation');
      } else {
        setCurrentView('menu');
      }
    };

    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, [adminToken, activeOrder]);

  // Fetch initial shop info & menu
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // Shop info
        const infoRes = await fetch('/api/shop-info');
        if (infoRes.ok) {
          const info = await infoRes.json();
          setShopInfo(info);
        }

        // Menu items
        const menuRes = await fetch('/api/menu');
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data.items);
          setCategories(data.categories);
        }
      } catch (err) {
        console.error('Error loading initial app data:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Cart operations
  const handleAddToCart = (item) => {
    if (item.available === 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (itemId, newQty) => {
    setCart((prev) => {
      if (newQty <= 0) {
        return prev.filter((i) => i.id !== itemId);
      }
      return prev.map((i) =>
        i.id === itemId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const handleRemoveCartItem = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
    localStorage.removeItem('siva_cart');
  };

  // Order Placement Success
  const handleOrderSuccess = (orderData) => {
    setActiveOrder(orderData);
    window.location.hash = `#order/${orderData.orderNumber}`;
    setCurrentView('order_confirmation');
  };

  // Admin Login Success
  const handleAdminLoginSuccess = (token, user) => {
    setAdminToken(token);
    setAdminUser(user);
    window.location.hash = '#admin';
    setCurrentView('admin_dashboard');
  };

  // Admin Logout
  const handleAdminLogout = () => {
    localStorage.removeItem('siva_admin_token');
    localStorage.removeItem('siva_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    window.location.hash = '';
    setCurrentView('menu');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-white text-2xl font-black mb-4 shadow-xl animate-pulse">
          ⚡
        </div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">SIVA'S FAST FOOD</h2>
        <p className="text-xs text-red-600 font-bold tracking-widest uppercase mt-0.5">
          FAST • FRESH • FIERY
        </p>
        <p className="text-xs text-gray-400 mt-3 font-medium">Loading delicious menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {/* 1. Customer Menu View */}
      {currentView === 'menu' && (
        <CustomerMenu
          shopInfo={shopInfo}
          menuItems={menuItems}
          categories={categories}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAdminLogin={() => {
            window.location.hash = '#admin';
            setCurrentView(adminToken ? 'admin_dashboard' : 'admin_login');
          }}
          activeOrder={activeOrder}
          onViewActiveOrder={() => setCurrentView('order_confirmation')}
        />
      )}

      {/* 2. Order Confirmation & Live Tracking View */}
      {currentView === 'order_confirmation' && (
        <OrderConfirmation
          orderData={activeOrder}
          onBackToMenu={() => {
            window.location.hash = '';
            setCurrentView('menu');
          }}
          onOpenBill={(ord) => setBillModalOrder(ord)}
        />
      )}

      {/* 3. Owner Login View */}
      {currentView === 'admin_login' && (
        <AdminLogin
          shopInfo={shopInfo}
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToMenu={() => {
            window.location.hash = '';
            setCurrentView('menu');
          }}
        />
      )}

      {/* 4. Owner Dashboard View */}
      {currentView === 'admin_dashboard' && (
        <AdminDashboard
          token={adminToken}
          user={adminUser}
          shopInfo={shopInfo}
          onLogout={handleAdminLogout}
          onOpenBill={(ord) => setBillModalOrder(ord)}
          onOpenCustomerView={() => {
            window.location.hash = '';
            setCurrentView('menu');
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Printable POS Thermal Bill Modal */}
      {billModalOrder && (
        <BillModal
          order={billModalOrder}
          shopInfo={shopInfo}
          onClose={() => setBillModalOrder(null)}
        />
      )}
    </div>
  );
}
