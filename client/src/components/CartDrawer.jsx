import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderSuccess
}) {
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        })),
        customerNotes: customerNotes.trim()
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order. Please try again.');
      }

      // Order created successfully
      onClearCart();
      setCustomerNotes('');
      onClose();
      onOrderSuccess(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-5 py-4 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-red-600/30 flex items-center justify-center text-red-500 font-bold">
                <ShoppingBag className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold">Your Food Cart</h2>
                <p className="text-xs text-gray-400">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded transition"
                  title="Clear all items"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <span className="font-bold">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-3xl">
                  🛒
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Your Cart is Empty</h3>
                <p className="text-sm text-gray-500 max-w-xs mb-6">
                  Explore our hot and fresh fried chicken, momos, noodles, fried rice & mojitos!
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 shadow-md transition"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => {
                    const subtotal = item.price * item.quantity;
                    return (
                      <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            {/* Veg / Non-Veg Indicator */}
                            <span
                              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                                item.is_veg
                                  ? 'border-green-600'
                                  : 'border-red-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.is_veg ? 'bg-green-600' : 'bg-red-600'
                                }`}
                              />
                            </span>
                            <h4 className="font-bold text-sm text-gray-900 leading-tight">
                              {item.name}
                            </h4>
                          </div>

                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            {item.quantity} × ₹{item.price} = <span className="font-bold text-gray-800">₹{subtotal}</span>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-red-200 bg-red-50/50 rounded-lg overflow-hidden shadow-xs">
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-100 active:bg-red-200 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-100 active:bg-red-200 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Special Instructions Note */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Cooking Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="E.g., Make it extra spicy, less salt, pack dip separately..."
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden transition bg-gray-50/70"
                    maxLength={200}
                  />
                </div>

                {/* Fast Food Takeaway Notice */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                  <span className="text-base shrink-0">⚡</span>
                  <div>
                    <span className="font-bold">Fast-Food Takeaway Counter:</span> No table booking needed. An automatic token number will be generated immediately for food collection.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-gray-200 bg-gray-50/70 space-y-3">
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal ({totalItems} items):</span>
                  <span className="font-semibold text-gray-900">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Takeaway Box & Packaging:</span>
                  <span className="font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Amount:</span>
                  <span className="text-red-600 text-lg">₹{totalAmount}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating Token...
                  </span>
                ) : (
                  <>
                    <span>PLACE ORDER (₹{totalAmount})</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
