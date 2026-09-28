import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, Flame, Sparkles, MapPin, ShieldAlert, Lock } from 'lucide-react';

export default function CustomerMenu({
  shopInfo,
  menuItems,
  categories,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenCart,
  onOpenAdminLogin,
  activeOrder,
  onViewActiveOrder
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('ALL'); // 'ALL' | 'VEG' | 'NON_VEG'

  // Cart stats
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Diet filter
      if (dietFilter === 'VEG' && item.is_veg !== 1) return false;
      if (dietFilter === 'NON_VEG' && item.is_veg === 1) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCategory = item.category.toLowerCase().includes(query);
        const matchDesc = (item.description || '').toLowerCase().includes(query);
        return matchName || matchCategory || matchDesc;
      }
      return true;
    });
  }, [menuItems, selectedCategory, dietFilter, searchQuery]);

  // Map cart items for fast lookup
  const cartMap = useMemo(() => {
    const map = {};
    for (const item of cart) {
      map[item.id] = item.quantity;
    }
    return map;
  }, [cart]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28">
      {/* Top Banner / Store Header */}
      <header className="bg-gray-950 text-white relative overflow-hidden shadow-xl border-b-4 border-red-600">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            {/* Tamil Header */}
            <span className="text-xs font-bold text-red-500 tracking-widest uppercase">
              {shopInfo?.tamilName || 'சிவாஸ் பாஸ்ட் ஃபுட்'}
            </span>

            {/* Quick link to Owner Dashboard */}
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-800 transition"
              title="Staff / Owner Dashboard"
            >
              <Lock className="w-3 h-3 text-red-500" />
              <span>Owner</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-2">
            {/* Logo Image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden border-2 border-red-500 flex items-center justify-center">
              <img
                src="/assets/logo.png"
                alt="Siva's Fast Food Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/assets/dish_chicken.png';
                }}
              />
            </div>

            {/* Shop Details */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
                <span>{shopInfo?.shopName || "SIVA'S FAST FOOD"}</span>
                <Flame className="w-6 h-6 text-red-500 fill-red-500" />
              </h1>

              {/* Tagline */}
              <div className="text-xs sm:text-sm font-black tracking-wider text-red-500 mt-0.5">
                {shopInfo?.tagline || 'FAST • FRESH • FIERY'}
              </div>

              <p className="text-xs text-amber-400 font-medium mt-1">
                ★ {shopInfo?.subtitle || 'Tasty Affordable Always'} ★
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-gray-300">
                <span className="flex items-center gap-1 text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  {shopInfo?.location || 'Ramakrishnapuram, Srivilliputhur'}
                </span>
                <span className="bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  ⚡ Takeaway Only • No Tables
                </span>
              </div>
            </div>
          </div>

          {/* Active Order Notice if customer has an ongoing order */}
          {activeOrder && (
            <div className="mt-4 bg-gradient-to-r from-red-900/60 to-amber-900/40 border border-red-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <span>
                  Active Order: <strong className="text-white">Token #{activeOrder.order_number || activeOrder.orderNumber}</strong> ({activeOrder.status})
                </span>
              </div>
              <button
                onClick={onViewActiveOrder}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-xs transition"
              >
                Track Live →
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sticky Search & Filter Section */}
      <div className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-gray-200/80 py-3 px-4 shadow-xs">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Search bar & Veg filter row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Fried Chicken, Fried Rice, Momos, Mojitos..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Diet Filter Switch */}
            <div className="flex bg-white border border-gray-200 rounded-xl p-0.5 shadow-2xs shrink-0">
              <button
                onClick={() => setDietFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dietFilter === 'ALL'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietFilter('VEG')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition ${
                  dietFilter === 'VEG'
                    ? 'bg-green-600 text-white shadow-xs'
                    : 'text-green-700 hover:text-green-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 border border-white" />
                Veg
              </button>
              <button
                onClick={() => setDietFilter('NON_VEG')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition ${
                  dietFilter === 'NON_VEG'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 hover:text-red-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 border border-white" />
                Non-Veg
              </button>
            </div>
          </div>

          {/* Horizontally scrollable Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              🍽️ All Menu ({menuItems.length})
            </button>

            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.category === cat).length;
              let icon = '🍴';
              if (cat.toLowerCase().includes('chicken')) icon = '🍗';
              else if (cat.toLowerCase().includes('rice')) icon = '🍚';
              else if (cat.toLowerCase().includes('momo')) icon = '🥟';
              else if (cat.toLowerCase().includes('noodle')) icon = '🍜';
              else if (cat.toLowerCase().includes('omelette')) icon = '🍳';
              else if (cat.toLowerCase().includes('mojito')) icon = '🍹';

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {icon} {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Cards Grid */}
      <main className="max-w-4xl mx-auto px-4 mt-4">
        {/* Results summary if searching */}
        {searchQuery && (
          <p className="text-xs text-gray-500 mb-3">
            Found <strong>{filteredItems.length}</strong> items matching "{searchQuery}"
          </p>
        )}

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center my-6">
            <div className="text-4xl mb-2">🍽️</div>
            <h3 className="font-bold text-gray-800 text-base">No Items Found</h3>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search query or switching category filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setDietFilter('ALL');
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const inCartQty = cartMap[item.id] || 0;
              const isAvailable = item.available === 1;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    isAvailable
                      ? 'border-gray-200/80 shadow-xs hover:shadow-md hover:border-red-200'
                      : 'border-gray-200 bg-gray-50/70 opacity-75'
                  }`}
                >
                  <div className="p-3.5 flex gap-3">
                    {/* Item Image with Badge */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                      <img
                        src={item.image_url || '/assets/dish_chicken.png'}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isAvailable ? 'hover:scale-105' : 'grayscale'
                        }`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/dish_chicken.png';
                        }}
                      />

                      {/* Badge if present */}
                      {item.badge && (
                        <div className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                          {item.badge}
                        </div>
                      )}

                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-1 text-center">
                          <span className="text-white text-[10px] font-black leading-tight">
                            Currently Unavailable
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Veg / Non-Veg Indicator & Category */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                              item.is_veg ? 'border-green-600' : 'border-red-600'
                            }`}
                            title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.is_veg ? 'bg-green-600' : 'bg-red-600'
                              }`}
                            />
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                            {item.category}
                          </span>
                        </div>

                        {/* Name */}
                        <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-1">
                          {item.name}
                        </h3>

                        {/* Description */}
                        {item.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Price & Actions */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <div className="text-base font-black text-red-600 font-mono">
                          ₹{item.price}
                        </div>

                        {/* Order Controls */}
                        {isAvailable ? (
                          inCartQty > 0 ? (
                            <div className="flex items-center border border-red-300 bg-red-50/70 rounded-xl overflow-hidden shadow-2xs">
                              <button
                                onClick={() => onUpdateCartQuantity(item.id, inCartQty - 1)}
                                className="w-7 h-7 flex items-center justify-center text-red-700 hover:bg-red-100 active:bg-red-200 transition"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold text-gray-900">
                                {inCartQty}
                              </span>
                              <button
                                onClick={() => onUpdateCartQuantity(item.id, inCartQty + 1)}
                                className="w-7 h-7 flex items-center justify-center text-red-700 hover:bg-red-100 active:bg-red-200 transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onAddToCart(item)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>ADD</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Mobile Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={onOpenCart}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white py-3.5 px-5 rounded-2xl shadow-xl shadow-red-600/35 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-semibold text-red-200 uppercase tracking-widest leading-none">
                    Takeaway Order
                  </div>
                  <div className="text-sm font-black text-white leading-tight">
                    {totalCartCount} {totalCartCount === 1 ? 'ITEM' : 'ITEMS'} • ₹{totalCartAmount}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-black bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition">
                <span>VIEW CART</span>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
