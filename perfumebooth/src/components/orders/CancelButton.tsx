'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cancelShopifyOrder } from '@/lib/actions/actions';
import { motion, AnimatePresence } from 'framer-motion';

interface CancelButtonProps {
  orderId: string;
  customerId: string;
  fulfillmentStatus?: string | null;
  cancelledAt?: string | null;
}

export default function CancelButton({
  orderId,
  customerId,
  fulfillmentStatus,
  cancelledAt,
}: CancelButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccessfullyCancelled, setIsSuccessfullyCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (showConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showConfirm]);

  // Check visibility requirements
  if (!isMounted) return null;
  
  if (fulfillmentStatus?.toLowerCase() === 'fulfilled' || cancelledAt || isSuccessfullyCancelled) {
    return null;
  }

  const handleCancelOrder = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await cancelShopifyOrder(orderId, customerId);
        
        if (result.success) {
          setIsSuccessfullyCancelled(true);
          setShowConfirm(false);
          router.refresh();
        } else {
          setError(result.error || 'Failed to cancel order. Please try again or contact support.');
          setShowConfirm(false);
        }
      } catch (err) {
        console.error('Cancellation error:', err);
        setError('An unexpected error occurred. Please try again later.');
        setShowConfirm(false);
      }
    });
  };

  return (
    <div className="relative inline-block w-full md:w-auto">
      {error && (
        <p className="text-red-600 text-[10px] font-black uppercase tracking-widest mb-3 text-center md:text-right">
          {error}
        </p>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        className="px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300 rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98] shadow-sm bg-white w-full md:w-auto"
      >
        Cancel Order
      </button>

      {/* Confirmation Modal Pop-up */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isPending) setShowConfirm(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Container Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-2xl z-10 text-center"
            >
              {/* Alert Icon Badge */}
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5 text-red-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              <h3 className="text-base font-black text-[#1a1410] uppercase tracking-tight mb-2">
                Cancel Your Order?
              </h3>
              
              <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-8 max-w-xs mx-auto">
                Are you sure you want to cancel this order? This action is final and cannot be reversed. Your selected items will be released back into the catalog.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  disabled={isPending}
                  onClick={handleCancelOrder}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white transition-all duration-300 text-xs font-black uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 active:scale-[0.98]"
                >
                  {isPending ? "Cancelling Order..." : "Confirm Cancellation"}
                </button>
                
                <button
                  disabled={isPending}
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-3 bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300 text-xs font-black uppercase tracking-wider rounded-xl active:scale-[0.98]"
                >
                  Keep My Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
