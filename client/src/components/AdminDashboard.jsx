import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  LayoutDashboard,
  UtensilsCrossed,
  History,
  QrCode,
  LogOut,
  Bell,
  BellOff,
  Clock,
  Printer,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  LockKeyhole,
  UserRound
} from 'lucide-react';
import { playOrderChime, playReadyAlert } from '../utils/audio';

export default function AdminDashboard({
  token,
  user,
  shopInfo,
  onLogout,
  onAccountUpdated,
  onOpenBill,
  onOpenCustomerView
}) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'history' | 'menu' | 'qr' | 'account'
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orderFilter, setOrderFilter] = useState('ALL'); // 'ALL' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [notification, setNotification] = useState(null);

  // Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    category: 'Fried Rice',
    price: '',
    description: '',
    image_url: '',
    is_veg: 0,
    available: 1,
    badge: '',
    sort_order: 0
  });

  // QR Standee State
  const [qrTargetUrl, setQrTargetUrl] = useState(window.location.origin);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Owner Account State
  const [accountForm, setAccountForm] = useState({
    currentPassword: '',
    newUsername: user?.username || '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  useEffect(() => {
    setAccountForm((prev) => ({
      ...prev,
      newUsername: user?.username || ''
    }));
  }, [user?.username]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) setStats(await statsRes.json());

      // Orders
      const ordersRes = await fetch('/api/admin/orders?limit=100', { headers });
      if (ordersRes.ok) setOrders(await ordersRes.json());

      // Menu
      const menuRes = await fetch('/api/menu');
      if (menuRes.ok) {
        const data = await menuRes.json();
        setMenuItems(data.items);
        setCategories(data.categories);
      }

      // QR Code
      fetchQrCode(qrTargetUrl);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const fetchQrCode = async (target) => {
    try {
      const res = await fetch(`/api/admin/qr?url=${encodeURIComponent(target)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrDataUrl(data.qrDataUrl);
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Real-Time SSE Listener
  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource('/api/orders/stream');

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.onerror = () => {
        setSseConnected(false);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.type === 'NEW_ORDER') {
            const newOrd = parsed.data;
            setOrders((prev) => [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]);
            if (soundEnabled) playOrderChime();
            showNotice(`🔔 New Order Token #${newOrd.order_number} received! (₹${newOrd.total_amount})`);

            // Refresh stats
            fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => r.json())
              .then(setStats)
              .catch(() => {});
          }

          if (parsed.type === 'ORDER_UPDATED') {
            const updated = parsed.data;
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

            fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => r.json())
              .then(setStats)
              .catch(() => {});
          }

          if (parsed.type === 'MENU_UPDATED') {
            fetch('/api/menu')
              .then((r) => r.json())
              .then((data) => {
                setMenuItems(data.items);
                setCategories(data.categories);
              })
              .catch(() => {});
          }
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.warn('SSE connection failed:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [token, soundEnabled]);

  const showNotice = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Update Owner Username / Password
  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    const currentPassword = accountForm.currentPassword;
    const newUsername = accountForm.newUsername.trim();
    const newPassword = accountForm.newPassword;
    const confirmPassword = accountForm.confirmPassword;

    if (!currentPassword) {
      setAccountError('Please enter your current password.');
      return;
    }

    if (!newUsername && !newPassword) {
      setAccountError('Enter a new username or a new password.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setAccountError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountError('New password and confirm password do not match.');
      return;
    }

    setIsUpdatingAccount(true);

    try {
      const res = await fetch('/api/admin/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newUsername,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account details.');
      }

      if (data.token && data.user && onAccountUpdated) {
        onAccountUpdated(data.token, data.user);
      }

      setAccountForm({
        currentPassword: '',
        newUsername: data.user?.username || newUsername,
        newPassword: '',
        confirmPassword: ''
      });

      setAccountSuccess('Owner account updated successfully. Your new login details are now active.');
      showNotice('Owner account updated successfully!');
    } catch (err) {
      setAccountError(err.message || 'Failed to update account details.');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update order status');
      }

      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      showNotice(`Order #${data.order.order_number} updated to ${newStatus}`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async (itemId) => {
    try {
      const res = await fetch(`/api/admin/menu/${itemId}/toggle-availability`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to toggle availability');
      const updated = await res.json();
      setMenuItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      showNotice(`${updated.name} is now ${updated.available ? 'Available' : 'Unavailable'}`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this food item?')) return;
    try {
      const res = await fetch(`/api/admin/menu/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete item');
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
      showNotice('Item deleted successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  // Save Menu Item (Add or Edit)
  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    try {
      const url = editingItem
        ? `/api/admin/menu/${editingItem.id}`
        : '/api/admin/menu';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(menuForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save menu item');
      }

      setIsMenuModalOpen(false);
      setEditingItem(null);
      fetchData();
      showNotice(`Food item ${editingItem ? 'updated' : 'added'} successfully!`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMenuForm((prev) => ({ ...prev, image_url: data.imageUrl }));
      showNotice('Image uploaded successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      image_url: item.image_url || '',
      is_veg: item.is_veg,
      available: item.available,
      badge: item.badge || '',
      sort_order: item.sort_order || 0
    });
    setIsMenuModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingItem(null);
    setMenuForm({
      name: '',
      category: categories[0] || 'Fried Rice',
      price: '',
      description: '',
      image_url: '/assets/dish_chicken.png',
      is_veg: 0,
      available: 1,
      badge: '',
      sort_order: 0
    });
    setIsMenuModalOpen(true);
  };

  // Filtered Orders for Kitchen Board
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'ALL') return o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
    return o.status === orderFilter;
  });

  // Filtered Orders for Order History
  const historyOrders = orders.filter((o) => {
    if (historySearch.trim()) {
      const query = historySearch.trim().toLowerCase();
      const matchNum = String(o.order_number).includes(query);
      const matchItem = (o.items || []).some((it) =>
        it.item_name.toLowerCase().includes(query)
      );
      if (!matchNum && !matchItem) return false;
    }
    if (historyDate) {
      const ordDate = o.created_at?.split(' ')[0] || '';
      if (ordDate !== historyDate) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans pb-16">
      {/* Real-time Notification Banner */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up text-sm font-bold border border-red-400">
          <span className="text-xl">🔔</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Owner Top Header */}
      <header className="bg-gray-950 border-b border-gray-800 px-4 sm:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 font-bold overflow-hidden p-0.5">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {shopInfo?.shopName || "SIVA'S FAST FOOD"}
                </h1>
                <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                  OWNER PORTAL
                </span>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-2">
                <span>{shopInfo?.tagline || 'FAST • FRESH • FIERY'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  {sseConnected ? 'Live Feed' : 'Connecting...'}
                </span>
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderChime();
              }}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                soundEnabled
                  ? 'bg-gray-800 border-gray-700 text-amber-400 hover:bg-gray-700'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
              title={soundEnabled ? 'Order sound is ON' : 'Order sound is OFF'}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            {/* Test Sound */}
            <button
              onClick={() => playOrderChime()}
              className="text-[11px] text-gray-400 hover:text-white bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-700 transition"
              title="Test Kitchen Bell"
            >
              Test Bell
            </button>

            {/* View Customer Website */}
            <button
              onClick={onOpenCustomerView}
              className="flex items-center gap-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 px-3 py-1.5 rounded-xl font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer Menu</span>
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Live Orders</span>
            {stats?.today?.pending > 0 && (
              <span className="bg-white text-red-600 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {stats.today.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Order History</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu Management ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code & Standee</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('account');
              setAccountError('');
              setAccountSuccess('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'account'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <LockKeyhole className="w-4 h-4" />
            <span>Owner Account</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 flex-1 w-full space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: LIVE ORDERS (KITCHEN ORDER DISPLAY)               */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gray-800/80 border border-gray-750 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                  Today's Orders
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {stats?.today?.orders ?? 0}
                </div>
                <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span>All Takeaway</span>
                </div>
              </div>

              <div className="bg-gray-800/80 border border-gray-750 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                  Today's Sales
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono">
                  ₹{stats?.today?.sales ?? 0}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Revenue</div>
              </div>

              <div className="bg-gray-800/80 border border-gray-750 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                  Pending Orders
                </span>
                <div className="text-2xl sm:text-3xl font-black text-red-500 mt-1">
                  {stats?.today?.pending ?? 0}
                </div>
                <div className="text-[11px] text-red-400 mt-1">
                  {stats?.today?.newCount ?? 0} New • {stats?.today?.preparingCount ?? 0} In Wok
                </div>
              </div>

              <div className="bg-gray-800/80 border border-gray-750 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                  Ready & Completed
                </span>
                <div className="text-2xl sm:text-3xl font-black text-green-400 mt-1">
                  {stats?.today?.completed ?? 0}
                </div>
                <div className="text-[11px] text-green-300 mt-1">
                  {stats?.today?.readyCount ?? 0} Waiting at Counter
                </div>
              </div>
            </div>

            {/* Order Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-800">
                {[
                  { key: 'ALL', label: 'Active Orders' },
                  { key: 'NEW', label: 'New' },
                  { key: 'PREPARING', label: 'Preparing' },
                  { key: 'READY', label: 'Ready for Pickup' },
                  { key: 'COMPLETED', label: 'Completed' }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setOrderFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      orderFilter === f.key
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {/* Orders Cards Grid */}
            {filteredOrders.length === 0 ? (
              <div className="bg-gray-800/40 border border-gray-800 rounded-3xl p-12 text-center">
                <div className="text-4xl mb-2">⚡</div>
                <h3 className="font-bold text-gray-300 text-base">No Orders in this Section</h3>
                <p className="text-xs text-gray-500 mt-1">
                  New orders will automatically pop up with a chime in real-time!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((ord) => {
                  const isNew = ord.status === 'NEW';
                  const isPreparing = ord.status === 'PREPARING';
                  const isReady = ord.status === 'READY';
                  const isCompleted = ord.status === 'COMPLETED';

                  return (
                    <div
                      key={ord.id}
                      className={`bg-gray-800 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                        isNew
                          ? 'border-red-500 ring-2 ring-red-500/30'
                          : isPreparing
                          ? 'border-amber-500/80 ring-1 ring-amber-500/20'
                          : isReady
                          ? 'border-green-500/80 ring-1 ring-green-500/20'
                          : 'border-gray-700 opacity-80'
                      }`}
                    >
                      {/* Card Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-gray-700/80 pb-3">
                          <div>
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest block">
                              Takeaway Token
                            </span>
                            <div className="text-3xl font-black text-white tracking-tight">
                              #{ord.order_number}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="text-right">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                isNew
                                  ? 'bg-red-500 text-white animate-pulse'
                                  : isPreparing
                                  ? 'bg-amber-500 text-gray-950 font-black'
                                  : isReady
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {ord.status}
                            </span>
                            <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-end gap-1 font-mono">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>{ord.created_at?.split(' ')[1]?.slice(0, 5) || 'Just now'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Notes */}
                        {ord.customer_notes && (
                          <div className="mt-3 bg-amber-950/70 border border-amber-800/80 rounded-xl p-2.5 text-xs text-amber-200">
                            <span className="font-bold">⚠️ Instructions:</span> {ord.customer_notes}
                          </div>
                        )}

                        {/* Items List */}
                        <div className="my-3 space-y-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Order Items:
                          </span>
                          <div className="space-y-1.5">
                            {(ord.items || []).map((it, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-xs py-1 border-b border-gray-750"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-gray-700 text-white font-bold flex items-center justify-center text-[11px]">
                                    {it.quantity}
                                  </span>
                                  <span className="font-medium text-gray-200">{it.item_name}</span>
                                </div>
                                <span className="text-gray-400 font-mono">
                                  ₹{it.subtotal || it.quantity * it.price}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer with Price & Workflow Status Buttons */}
                      <div className="pt-3 border-t border-gray-700/80 space-y-3">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-gray-400">Total Bill:</span>
                          <span className="text-xl font-black text-red-400 font-mono">
                            ₹{ord.total_amount}
                          </span>
                        </div>

                        {/* Status Advancement Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {isNew && (
                            <button
                              onClick={() => handleUpdateStatus(ord.id, 'PREPARING')}
                              className="col-span-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>ACCEPT & START COOKING</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}

                          {isPreparing && (
                            <button
                              onClick={() => {
                                handleUpdateStatus(ord.id, 'READY');
                                playReadyAlert();
                              }}
                              className="col-span-2 py-2.5 bg-green-600 hover:bg-green-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Bell className="w-4 h-4" />
                              <span>MARK READY FOR PICKUP</span>
                            </button>
                          )}

                          {isReady && (
                            <button
                              onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                              className="col-span-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>HANDOVER & COMPLETE</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenBill(ord)}
                            className="py-2 bg-gray-700 hover:bg-gray-650 text-white font-bold text-xs rounded-xl border border-gray-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View Bill</span>
                          </button>

                          {!isCompleted && ord.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Cancel order #${ord.order_number}?`)) {
                                  handleUpdateStatus(ord.id, 'CANCELLED');
                                }
                              }}
                              className="py-2 bg-gray-800 hover:bg-red-950 text-gray-400 hover:text-red-400 font-bold text-xs rounded-xl border border-gray-700 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ORDER HISTORY                                     */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-gray-800/80 border border-gray-750 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by Order # (e.g. 101) or item name..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>

                {/* Date Picker */}
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />

                {(historySearch || historyDate) && (
                  <button
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryDate('');
                    }}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-400 font-mono">
                Showing <strong>{historyOrders.length}</strong> orders
              </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/80 border border-gray-750 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-700">
                    <tr>
                      <th className="py-3 px-4">Token #</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-750">
                    {historyOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-gray-750/50 transition">
                        <td className="py-3 px-4 font-black text-white text-sm">
                          #{ord.order_number}
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono">
                          {ord.created_at}
                        </td>
                        <td className="py-3 px-4 text-gray-300 max-w-xs">
                          {(ord.items || [])
                            .map((it) => `${it.quantity}× ${it.item_name}`)
                            .join(', ')}
                        </td>
                        <td className="py-3 px-4 font-black text-amber-400 font-mono text-sm">
                          ₹{ord.total_amount}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ord.status === 'COMPLETED'
                                ? 'bg-green-950 text-green-400 border border-green-800'
                                : ord.status === 'READY'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : ord.status === 'NEW'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onOpenBill(ord)}
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition inline-flex items-center gap-1 font-medium"
                            title="View Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MENU MANAGEMENT (CRUD + AVAILABILITY TOGGLES)    */}
        {/* ======================================================== */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-800/80 border border-gray-750 rounded-2xl p-4">
              <div>
                <h2 className="text-base font-bold text-white">Food Menu Items</h2>
                <p className="text-xs text-gray-400">
                  Manage food names, categories, prices, images, and in-stock availability.
                </p>
              </div>

              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Food Item</span>
              </button>
            </div>

            {/* Items Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-gray-800 border rounded-2xl p-4 flex flex-col justify-between transition ${
                    item.available === 1
                      ? 'border-gray-700'
                      : 'border-red-900/50 bg-gray-850 opacity-75'
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={item.image_url || '/assets/dish_chicken.png'}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-900 shrink-0 border border-gray-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/dish_chicken.png';
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                            item.is_veg ? 'border-green-500' : 'border-red-500'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              item.is_veg ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white truncate mt-0.5">
                        {item.name}
                      </h3>

                      <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                        ₹{item.price}
                      </div>

                      {item.badge && (
                        <span className="inline-block bg-red-950 text-red-400 border border-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded mt-1">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-gray-700 flex items-center justify-between gap-2">
                    {/* Availability Switch */}
                    <button
                      onClick={() => handleToggleAvailability(item.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                        item.available === 1
                          ? 'bg-green-950 text-green-300 border-green-800 hover:bg-green-900'
                          : 'bg-red-950 text-red-300 border-red-800 hover:bg-red-900'
                      }`}
                      title="Click to toggle availability on customer menu"
                    >
                      <span>{item.available === 1 ? '✓ In Stock' : '✗ Unavailable'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                        title="Edit Item"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="p-1.5 bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-300 rounded-lg transition"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: QR CODE & SHOP COUNTER STANDEE                    */}
        {/* ======================================================== */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            <div className="bg-gray-800/80 border border-gray-750 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-1">
                Shop Counter QR Code Standee
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Customers scan this QR code with their mobile phone cameras to open the menu and place fast-food takeaway orders.
              </p>

              {/* URL Customizer for Demo / Network */}
              <div className="max-w-xl space-y-2 mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Customer Ordering Page Target URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrTargetUrl}
                    onChange={(e) => {
                      setQrTargetUrl(e.target.value);
                      fetchQrCode(e.target.value);
                    }}
                    className="flex-1 px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    placeholder="http://localhost:5000"
                  />
                  <button
                    onClick={() => fetchQrCode(qrTargetUrl)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    Update QR
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Tip: For testing on your actual phone on the same Wi-Fi, you can replace localhost with your PC IP address (e.g. http://192.168.1.X:5000).
                </p>
              </div>

              {/* Printable Standee Preview */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Standee Tent Card */}
                <div
                  id="printable-standee"
                  className="w-full max-w-sm bg-white text-gray-900 rounded-3xl p-6 shadow-2xl border-4 border-red-600 text-center relative overflow-hidden"
                >
                  {/* Top Header */}
                  <div className="text-xs font-black text-red-600 tracking-widest uppercase mb-1">
                    {shopInfo?.tamilName || 'சிவாஸ் பாஸ்ட் ஃபுட்'}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-gray-900">
                    {shopInfo?.shopName || "SIVA'S FAST FOOD"}
                  </h3>
                  <div className="text-xs font-black tracking-wider text-red-600 mt-0.5">
                    {shopInfo?.tagline || 'FAST • FRESH • FIERY'}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    ★ {shopInfo?.subtitle || 'Tasty Affordable Always'} ★
                  </p>

                  {/* QR Image Box */}
                  <div className="my-5 p-4 bg-gray-50 border-2 border-dashed border-red-400 rounded-2xl inline-block shadow-inner">
                    <span className="text-xs font-black text-gray-800 uppercase tracking-widest block mb-2">
                      ⚡ SCAN TO ORDER ⚡
                    </span>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan to order QR code"
                        className="w-56 h-56 mx-auto rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-56 h-56 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-500">
                        Generating QR...
                      </div>
                    )}
                    <span className="text-[10px] text-gray-500 mt-2 block font-mono">
                      No App Required • Direct Ordering
                    </span>
                  </div>

                  {/* 3 Steps Instructions */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left space-y-1.5 text-xs text-gray-800">
                    <div className="font-bold text-red-800 mb-1">How it works:</div>
                    <div>1. 📱 Scan QR Code with Phone Camera</div>
                    <div>2. 🍗 Select food & place order (No login!)</div>
                    <div>3. 🧾 Collect food at counter using Token #</div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-200 text-[11px] text-gray-600">
                    📍 {shopInfo?.location || 'Ramakrishnapuram, Srivilliputhur'}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">Standee Actions</h4>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Print this standee and display it at the shop billing counter or entrance so customers can scan immediately.
                  </p>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => window.print()}
                      className="py-3 px-5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Counter Standee</span>
                    </button>

                    {qrDataUrl && (
                      <a
                        href={qrDataUrl}
                        download="sivas_fast_food_qr.png"
                        className="py-3 px-5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl border border-gray-700 transition flex items-center gap-2 justify-center"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Download QR Code Image</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: OWNER ACCOUNT                                     */}
        {/* ======================================================== */}
        {activeTab === 'account' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-gray-800/80 border border-gray-750 rounded-3xl p-5 sm:p-7">
              <div className="flex items-start gap-4 pb-5 border-b border-gray-700">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <LockKeyhole className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Owner Account</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Change the owner username or password securely from the dashboard.
                  </p>
                </div>
              </div>

              {accountError && (
                <div className="mt-5 p-3.5 bg-red-950/70 border border-red-800 rounded-xl text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{accountError}</span>
                </div>
              )}

              {accountSuccess && (
                <div className="mt-5 p-3.5 bg-green-950/70 border border-green-800 rounded-xl text-green-300 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{accountSuccess}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAccount} className="space-y-5 mt-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Current Username
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={user?.username || ''}
                      readOnly
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-400 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    New Username
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={accountForm.newUsername}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          newUsername: e.target.value
                        }))
                      }
                      placeholder="Enter new username"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Current Password *
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      required
                      value={accountForm.currentPassword}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))
                      }
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Your current password is required to confirm this change.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      value={accountForm.newPassword}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value
                        }))
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Leave blank if you only want to change the username. Minimum 6 characters.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      value={accountForm.confirmPassword}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))
                      }
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400">
                  <strong className="text-gray-300">Security:</strong> You must enter your current password before the username or password can be changed.
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingAccount}
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    {isUpdatingAccount ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Updating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Update Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Menu Item Add / Edit Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
              <h3 className="font-bold text-lg text-white">
                {editingItem ? 'Edit Food Item' : 'Add New Food Item'}
              </h3>
              <button
                onClick={() => setIsMenuModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Food Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. Chicken Popcorn"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Category *
                  </label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Fried Chicken">Fried Chicken</option>
                    <option value="Fried Rice">Fried Rice</option>
                    <option value="Momo's">Momo's</option>
                    <option value="Noodles">Noodles</option>
                    <option value="Omelette">Omelette</option>
                    <option value="Mojitos">Mojitos</option>
                    <option value="Combos">Combos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. 120"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Diet Type
                  </label>
                  <select
                    value={menuForm.is_veg}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, is_veg: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value={0}>Non-Veg 🔴</option>
                    <option value={1}>Pure Veg 🟢</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={menuForm.badge}
                    onChange={(e) => setMenuForm({ ...menuForm, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. Bestseller, Spicy 🔥"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-red-500"
                    placeholder="Crispy fried chicken bites with secret spice blend..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-400 uppercase font-bold mb-1">
                    Image URL or File Upload
                  </label>
                  <input
                    type="text"
                    value={menuForm.image_url}
                    onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-red-500 mb-2"
                    placeholder="https://... or /assets/dish_chicken.png"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="modal-available"
                    checked={menuForm.available === 1}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, available: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-red-600 rounded bg-gray-950 border-gray-800"
                  />
                  <label htmlFor="modal-available" className="text-gray-300 font-bold">
                    Item is Currently In Stock & Available to Order
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
