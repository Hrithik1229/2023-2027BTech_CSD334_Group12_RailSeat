import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Info,
  Landmark,
  ShoppingBag,
  Timer,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MockRazorpayModalProps {
  isOpen: boolean;
  amount: number;          // in ₹ (rupees)
  orderId: string;
  userName: string;
  userPhone?: string;
  trainName: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure: () => void;
  onDismiss: () => void;
}

// ─── Payment method data ─────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    id: 'cards',
    label: 'Cards',
    icon: <CreditCard className="w-4 h-4" />,
    logos: [
      { label: 'Visa', color: '#1a1f71', text: 'VISA' },
      { label: 'Mastercard', color: '#eb001b', text: 'MC' },
      { label: 'Amex', color: '#007bc1', text: 'AMEX' },
      { label: 'Rupay', color: '#1e6ec8', text: 'RuPay' },
    ],
  },
  {
    id: 'netbanking',
    label: 'Netbanking',
    icon: <Landmark className="w-4 h-4" />,
    logos: [
      { label: 'SBI', color: '#22477f', text: 'SBI' },
      { label: 'HDFC', color: '#004c8f', text: 'HDFC' },
      { label: 'ICICI', color: '#f58220', text: 'ICICI' },
      { label: 'Axis', color: '#97144d', text: 'Axis' },
    ],
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: <Wallet className="w-4 h-4" />,
    logos: [
      { label: 'Paytm', color: '#00b9f1', text: 'Paytm' },
      { label: 'PhonePe', color: '#5f259f', text: 'PhPe' },
      { label: 'Amazon', color: '#ff9900', text: 'Amzn' },
    ],
  },
  {
    id: 'paylater',
    label: 'Pay Later',
    icon: <Timer className="w-4 h-4" />,
    logos: [
      { label: 'LazyPay', color: '#00bfff', text: 'Lazy' },
      { label: 'simpl', color: '#ff4500', text: 'Simpl' },
      { label: 'ZCPL', color: '#0070ba', text: 'ZestM' },
    ],
  },
];

const WALLET_OPTIONS = [
  { name: 'Mobikwik', color: '#00adef', letter: 'M' },
  { name: 'Airtel Payments Bank', color: '#e40000', letter: 'A' },
  { name: 'Ola Money (Postpaid + Wallet)', color: '#45b649', letter: 'O' },
  { name: 'JioMoney', color: '#0068b3', letter: 'J' },
];

// ─── Small logo chip ─────────────────────────────────────────────────────────

const LogoChip = ({ color, text }: { color: string; text: string }) => (
  <span
    className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white leading-none"
    style={{ backgroundColor: color, minWidth: 28 }}
  >
    {text}
  </span>
);

// ─── Main component ──────────────────────────────────────────────────────────

const MockRazorpayModal = ({
  isOpen,
  amount,
  orderId,
  userName,
  userPhone,
  trainName,
  onSuccess,
  onFailure,
  onDismiss,
}: MockRazorpayModalProps) => {
  const [phase, setPhase] = useState<'options' | 'processing' | 'success'>('options');
  const [selectedMethod, setSelectedMethod] = useState<string>('wallet');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPhase('options');
      setSelectedMethod('wallet');
      setSelectedWallet(null);
      setCountdown(3);
      setCopied(false);
    }
  }, [isOpen]);

  // Countdown on success
  useEffect(() => {
    if (phase !== 'success') return;
    if (countdown <= 0) {
      onSuccess(paymentId, orderId);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handlePay = () => {
    setPhase('processing');
    const mockPid = `pay_${Math.random().toString(36).substr(2, 16).toUpperCase()}`;
    setPaymentId(mockPid);
    // Simulate network delay
    setTimeout(() => setPhase('success'), 1800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        onClick={(e) => { if (e.target === e.currentTarget && phase !== 'processing') onDismiss(); }}
      >
        {/* Modal shell */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative flex rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 740, maxWidth: '95vw', minHeight: 440 }}
        >
          {/* ── Left panel ─────────────────────────────────────────── */}
          <div
            className="flex flex-col"
            style={{
              width: 260,
              background: 'linear-gradient(160deg, #4f46e5 0%, #312eab 60%, #1e1a8a 100%)',
              padding: '28px 24px',
              flexShrink: 0,
            }}
          >
            {/* Brand */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
                <span className="text-indigo-700 font-extrabold text-sm">R</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">RailSeat</span>
            </div>

            {/* Price summary card */}
            <div className="bg-white/15 rounded-xl p-4 mb-4 backdrop-blur-sm border border-white/20">
              <div className="text-white/70 text-xs font-medium mb-1">Price Summary</div>
              <div className="text-white text-2xl font-extrabold">₹{amount.toLocaleString('en-IN')}</div>
            </div>

            {/* User chip */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/15">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8c0-3.314 3.134-6 7-6s7 2.686 7 6H3z" />
                </svg>
              </div>
              <span className="text-white/80 text-xs font-medium truncate">
                {userPhone ? `Using as ${userPhone}` : userName}
              </span>
              <ChevronRight className="w-3 h-3 text-white/50 ml-auto shrink-0" />
            </div>

            {/* Illustration area */}
            <div className="flex-1 flex items-end justify-center mt-4 pointer-events-none select-none">
              <div className="opacity-30">
                <ShoppingBag className="w-20 h-20 text-white" />
              </div>
            </div>

            {/* Razorpay brand */}
            <div className="flex items-center gap-1.5 mt-4">
              <span className="text-white/40 text-[10px]">Secured by</span>
              <span className="text-white/70 text-xs font-bold italic tracking-tight">⚡Razorpay</span>
            </div>
          </div>

          {/* ── Right panel ────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white relative">
            {/* Close button */}
            {phase !== 'processing' && (
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}

            <AnimatePresence mode="wait">
              {/* ── Payment options ─────────────────────────────────── */}
              {phase === 'options' && (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-1 overflow-hidden"
                >
                  {/* Method list */}
                  <div className="w-44 border-r border-gray-100 flex flex-col py-6 px-0">
                    <div className="px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Payment Options
                    </div>
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method.id}
                        onClick={() => { setSelectedMethod(method.id); setSelectedWallet(null); }}
                        className={`w-full flex flex-col items-start px-5 py-3 transition-colors text-left ${
                          selectedMethod === method.id
                            ? 'bg-indigo-50 border-r-2 border-indigo-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-sm font-medium mb-1.5 ${selectedMethod === method.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {method.label}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {method.logos.map(l => (
                            <LogoChip key={l.label} color={l.color} text={l.text} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Sub-options panel */}
                  <div className="flex-1 flex flex-col py-6">
                    <div className="px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      {selectedMethod === 'wallet' ? 'All Wallet Options' :
                       selectedMethod === 'cards' ? 'Pay by Card' :
                       selectedMethod === 'netbanking' ? 'Select Your Bank' : 'Pay Later Options'}
                    </div>

                    {/* Wallet options */}
                    {selectedMethod === 'wallet' && (
                      <div className="flex flex-col gap-1 px-4">
                        {WALLET_OPTIONS.map(w => (
                          <button
                            key={w.name}
                            onClick={() => setSelectedWallet(w.name)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                              selectedWallet === w.name
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ backgroundColor: w.color }}
                              >
                                {w.letter}
                              </div>
                              <span className="text-sm text-gray-700">{w.name}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Cards mock form */}
                    {selectedMethod === 'cards' && (
                      <div className="px-5 flex flex-col gap-3">
                        <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors" placeholder="Card number" maxLength={19} />
                        <div className="flex gap-3">
                          <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors w-1/2" placeholder="MM / YY" maxLength={7} />
                          <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors w-1/2" placeholder="CVV" maxLength={4} type="password" />
                        </div>
                        <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors" placeholder="Card holder name" />
                        <p className="text-[10px] text-gray-400">Use any test card e.g. 4111 1111 1111 1111</p>
                      </div>
                    )}

                    {/* Netbanking options */}
                    {selectedMethod === 'netbanking' && (
                      <div className="px-5 grid grid-cols-2 gap-2">
                        {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'PNB'].map(bank => (
                          <button
                            key={bank}
                            onClick={() => setSelectedWallet(bank)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                              selectedWallet === bank
                                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <Landmark className="w-3.5 h-3.5 shrink-0" />
                            {bank}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Pay Later options */}
                    {selectedMethod === 'paylater' && (
                      <div className="flex flex-col gap-1 px-4">
                        {['LazyPay', 'Simpl', 'ZestMoney', 'HDFC PayLater'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSelectedWallet(opt)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                              selectedWallet === opt
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-sm text-gray-700">{opt}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Pay button */}
                    <div className="mt-auto px-4 pb-4 pt-4">
                      <button
                        onClick={handlePay}
                        className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
                        style={{
                          background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
                          boxShadow: '0 4px 15px rgba(79,70,229,0.4)',
                        }}
                      >
                        Pay ₹{amount.toLocaleString('en-IN')}
                      </button>
                      <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
                        <Info className="w-3 h-3" /> Test mode — no real payment processed
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Processing ──────────────────────────────────────── */}
              {phase === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-5"
                >
                  <div className="w-14 h-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                  <p className="text-gray-600 text-sm font-medium">Processing payment…</p>
                </motion.div>
              )}

              {/* ── Success ─────────────────────────────────────────── */}
              {phase === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-5 px-6"
                  style={{ background: 'linear-gradient(160deg, #22c55e 0%, #16a34a 100%)' }}
                >
                  <p className="text-white/80 text-xs font-medium">
                    You will be redirected in {countdown} second{countdown !== 1 ? 's' : ''}
                  </p>
                  <h2 className="text-white text-2xl font-bold -mt-1">Payment Successful</h2>

                  {/* Animated checkmark */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-lg"
                  >
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </motion.div>

                  {/* Receipt card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-gray-900">RailSeat</div>
                        <div className="text-xs text-gray-500 mt-0.5">{formattedDate}, {formattedTime}</div>
                      </div>
                      <div className="font-bold text-gray-900">₹{amount.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                      <Wallet className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-500">Wallet</span>
                      <span className="font-mono text-gray-800 ml-1 truncate">{paymentId}</span>
                      <button onClick={handleCopy} className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-3 border-t border-gray-100 pt-3">
                      <Info className="w-3 h-3" />
                      <span>Visit razorpay.com/support for queries</span>
                    </div>
                  </motion.div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-white/60 text-[11px]">Secured by</span>
                    <span className="text-white/90 text-xs font-bold italic">⚡Razorpay</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Test mode badge */}
            <div
              className="absolute top-0 right-0 text-white text-[9px] font-bold px-5 py-1 overflow-hidden"
              style={{
                background: '#e63946',
                transform: 'rotate(45deg) translateX(18px) translateY(-8px)',
                transformOrigin: 'top right',
                width: 80,
                textAlign: 'center',
              }}
            >
              Test Mode
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MockRazorpayModal;
