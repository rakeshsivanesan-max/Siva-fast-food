import React from 'react';
import { Printer, X, CheckCircle, Clock } from 'lucide-react';

export default function BillModal({ order, shopInfo, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  const formattedTime = order.created_at
    ? new Date(order.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : new Date().toLocaleTimeString('en-IN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <h3 className="font-bold text-lg">Order Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content (Printed via Thermal format) */}
        <div className="p-6 overflow-y-auto font-mono text-sm space-y-4" id="printable-receipt">
          {/* Shop Header */}
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-4">
            <div className="text-xs text-red-600 font-bold tracking-widest uppercase">
              {shopInfo?.tamilName || 'சிவாஸ் பாஸ்ட் ஃபுட்'}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 mt-1">
              {shopInfo?.shopName || "SIVA'S FAST FOOD"}
            </h2>
            <p className="text-xs font-bold text-red-600 tracking-wider mt-0.5">
              {shopInfo?.tagline || 'FAST • FRESH • FIERY'}
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              {shopInfo?.subtitle || 'Tasty Affordable Always'}
            </p>
            <p className="text-[11px] text-gray-600 mt-1 font-sans">
              📍 {shopInfo?.location || 'Ramakrishnapuram, Srivilliputhur'}
            </p>
          </div>

          {/* Token & Info Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <span className="text-xs uppercase tracking-wider text-red-700 font-semibold block">
              Order Token Number
            </span>
            <span className="text-3xl font-black text-red-600 tracking-wider">
              #{order.order_number}
            </span>
            <div className="flex justify-between items-center text-xs text-gray-600 mt-2 pt-2 border-t border-red-200/60 font-sans">
              <span>Date: <strong>{formattedDate}</strong></span>
              <span>Time: <strong>{formattedTime}</strong></span>
            </div>
          </div>

          {/* Customer Note if any */}
          {order.customer_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900">
              <span className="font-bold">Note:</span> {order.customer_notes}
            </div>
          )}

          {/* Items Table */}
          <div className="border-t-2 border-dashed border-gray-300 pt-3">
            <div className="flex justify-between text-xs font-bold text-gray-500 pb-2 border-b border-gray-200 uppercase">
              <span className="w-1/2">Item</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-1/6 text-right">Price</span>
              <span className="w-1/6 text-right">Total</span>
            </div>

            <div className="divide-y divide-gray-100 py-1">
              {order.items && order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 text-xs text-gray-800">
                  <span className="w-1/2 font-sans font-medium pr-1">{item.item_name}</span>
                  <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                  <span className="w-1/6 text-right">₹{item.price}</span>
                  <span className="w-1/6 text-right font-bold">₹{item.subtotal || item.quantity * item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Subtotal:</span>
              <span>₹{order.total_amount}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Takeaway Packaging:</span>
              <span className="text-green-600 font-bold">FREE</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
              <span>TOTAL AMOUNT:</span>
              <span className="text-red-600 text-lg">₹{order.total_amount}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 border-t-2 border-dashed border-gray-300 text-xs text-gray-500 space-y-1">
            <p className="font-bold text-gray-700">★ {shopInfo?.slogan || 'Good Food • Great Mood'} ★</p>
            <p>Please present Token #{order.order_number} to collect your fresh food!</p>
            <p className="text-[10px] text-gray-400">Thank you for visiting Siva's Fast Food</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
