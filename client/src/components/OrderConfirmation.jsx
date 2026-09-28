import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, ChefHat, Bell, Check, Printer, ArrowLeft, RefreshCw } from 'lucide-react';
import { playReadyAlert } from '../utils/audio';

export default function OrderConfirmation({ orderData, onBackToMenu, onOpenBill }) {
  const [currentOrder, setCurrentOrder] = useState(orderData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Poll & listen for real-time status changes
  useEffect(() => {
    if (!orderData?.orderNumber) return;

    let eventSource;
    try {
      eventSource = new EventSource('/api/orders/stream');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'ORDER_UPDATED' && parsed.data?.order_number === orderData.orderNumber) {
            setCurrentOrder((prev) => {
              if (parsed.data.status === 'READY' && prev.status !== 'READY') {
                playReadyAlert();
              }
              return { ...prev, ...parsed.data };
            });
          }
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.warn('SSE not supported or blocked, relying on periodic sync:', err);
    }

    // Periodic backup poll every 5s
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderData.orderNumber}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentOrder((prev) => {
            if (data.status === 'READY' && prev.status !== 'READY') {
              playReadyAlert();
            }
            return data;
          });
        }
      } catch {
        // silent fail
      }
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [orderData?.orderNumber]);

  const refreshStatus = async () => {
    if (!orderData?.orderNumber) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${orderData.orderNumber}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentOrder(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const status = currentOrder?.status || 'NEW';

  const steps = [
    { key: 'NEW', label: 'Order Received', desc: 'Sent to kitchen', icon: Clock },
    { key: 'PREPARING', label: 'Preparing', desc: 'Cooking fresh in wok', icon: ChefHat },
    { key: 'READY', label: 'Ready for Pickup', desc: 'At the counter', icon: Bell },
    { key: 'COMPLETED', label: 'Completed', desc: 'Enjoy your food!', icon: Check }
  ];

  const getStepIndex = (st) => {
    switch (st) {
      case 'NEW': return 0;
      case 'PREPARING': return 1;
      case 'READY': return 2;
      case 'COMPLETED': return 3;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/50 via-white to-orange-50/40 py-8 px-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Top Return Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-red-600 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>

          <button
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs transition"
            title="Refresh order status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Main Success Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

          {/* Success Checkmark */}
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-xl font-black text-gray-900 tracking-tight">ORDER PLACED!</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Your fast-food order has been confirmed
          </p>

          {/* Token Box */}
          <div className="my-6 bg-linear-to-br from-red-600 to-red-700 text-white rounded-2xl p-5 shadow-lg shadow-red-600/30">
            <span className="text-xs font-semibold uppercase tracking-widest text-red-200 block mb-1">
              Your Order Token Number
            </span>
            <div className="text-5xl font-black tracking-tight drop-shadow-md">
              #{currentOrder.order_number || currentOrder.orderNumber}
            </div>
            <div className="mt-3 inline-block bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-medium">
              Total Amount: <strong>₹{currentOrder.total_amount || currentOrder.totalAmount}</strong>
            </div>
          </div>

          {/* Live Status Alert Banner */}
          {status === 'READY' ? (
            <div className="bg-green-500 text-white rounded-xl p-4 shadow-md animate-bounce">
              <div className="text-lg font-black flex items-center justify-center gap-2">
                <Bell className="w-6 h-6 animate-pulse" />
                FOOD IS READY FOR PICKUP!
              </div>
              <p className="text-xs text-green-100 mt-1">
                Please show Token #{currentOrder.order_number || currentOrder.orderNumber} at the counter.
              </p>
            </div>
          ) : status === 'COMPLETED' ? (
            <div className="bg-gray-800 text-white rounded-xl p-3 text-xs font-medium">
              ✓ Order Delivered & Completed. Thank you!
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
              🍳 Please wait for your food to be prepared. We cook every dish fresh & fiery!
            </div>
          )}

          {/* Status Stepper */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
              Live Preparation Tracker
            </h4>

            <div className="space-y-4">
              {steps.map((st, idx) => {
                const Icon = st.icon;
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={st.key} className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-red-600 text-white ring-4 ring-red-100 font-bold scale-110'
                          : isPassed
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isCurrent
                              ? 'text-red-600 text-sm'
                              : isPassed
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {st.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">{st.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ordered Items Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Ordered Items
          </h3>
          <div className="divide-y divide-gray-100">
            {(currentOrder.items || []).map((it, i) => (
              <div key={i} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-gray-900">{it.item_name}</span>
                  <div className="text-gray-500">
                    {it.quantity} × ₹{it.price}
                  </div>
                </div>
                <div className="font-bold text-gray-900">
                  ₹{it.subtotal || it.quantity * it.price}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-gray-200 flex justify-between items-center font-bold text-sm text-gray-900">
            <span>Total:</span>
            <span className="text-red-600 font-black text-base">
              ₹{currentOrder.total_amount || currentOrder.totalAmount}
            </span>
          </div>

          {currentOrder.customer_notes && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
              <span className="font-bold">Instructions:</span> {currentOrder.customer_notes}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onOpenBill(currentOrder)}
            className="flex-1 py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            View / Print Bill
          </button>
          <button
            onClick={onBackToMenu}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            Order More Food
          </button>
        </div>
      </div>
    </div>
  );
}
