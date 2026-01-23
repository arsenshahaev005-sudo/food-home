"use client";

import { useState, useEffect } from "react";
import { PaymentMethod, getSbpLink } from "@/lib/api";
import { IMaskInput } from 'react-imask';
import cardValidator from 'card-validator';
import { QRCodeSVG } from 'qrcode.react';

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethods: PaymentMethod[];
  onAddCard: (card: { card_type: string; last_four: string; exp_month: string; exp_year: string }) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
}

const PaymentMethodRow = ({ pm, onDeleteCard }: { pm: PaymentMethod, onDeleteCard: (id: string) => Promise<void> }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#fff5f0] border border-transparent">
      <div className="flex items-center space-x-3">
        {/* Icon placeholder */}
        <div className="font-bold text-[#1a1a1a] w-8">{pm.card_type === 'Mir' ? 'МИР' : pm.card_type}</div>
        <div>
          <div className="font-medium text-[#1a1a1a]">{pm.card_type} •• {pm.last_four}</div>
          {pm.is_default && <div className="text-sm text-gray-500">Основной</div>}
        </div>
      </div>
      <button 
        onClick={() => onDeleteCard(pm.id)} 
        className="transition-colors duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ color: isHovered ? '#c9825b' : '#9ca3af' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

type View = 'LIST' | 'ADD_CARD' | 'SBP';

export default function PaymentMethodsModal({
  isOpen,
  onClose,
  paymentMethods,
  onAddCard,
  onDeleteCard
}: PaymentMethodsModalProps) {
  const [view, setView] = useState<View>('LIST');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [sbpPayload, setSbpPayload] = useState('');
  const [sbpLoading, setSbpLoading] = useState(false);
  const [isAddCardHovered, setIsAddCardHovered] = useState(false);
  const [isSbpHovered, setIsSbpHovered] = useState(false);

  // Hover states for animations
  const [isBackHovered, setIsBackHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [isBindHovered, setIsBindHovered] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  useEffect(() => {
    if (view === 'SBP' && !sbpPayload) {
      const fetchSbp = async () => {
        setSbpLoading(true);
        try {
          const token = getCookie("accessToken");
          if (token) {
            const data = await getSbpLink(token);
            setSbpPayload(data.qr_payload);
          }
        } catch (e) {
          console.error(e);
          // alert("Не удалось получить QR код СБП"); // Optional: don't annoy user if it fails
        } finally {
          setSbpLoading(false);
        }
      };
      fetchSbp();
    }
  }, [view, sbpPayload]);

  if (!isOpen) return null;

  const handleAddCardSubmit = async () => {
    // Basic validation
    const numberValidation = cardValidator.number(cardNumber);
    const expiryValidation = cardValidator.expirationDate(expiry);
    const cvcValidation = cardValidator.cvv(cvc);

    if (!numberValidation.isValid || !expiryValidation.isValid || !cvcValidation.isValid) {
      alert("Пожалуйста, проверьте правильность введенных данных");
      return;
    }

    setLoading(true);
    try {
      const lastFour = cardNumber.replace(/\s/g, '').slice(-4);
      const [month, year] = expiry.split('/');
      
      // Use detected type or fallback
      let type = numberValidation.card?.niceType || 'Visa';
      // Normalize type names
      if (type === 'Mastercard') type = 'Mastercard'; // already correct
      if (type === 'Mir') type = 'Mir'; // card-validator might support 'mir'

      await onAddCard({
        card_type: type,
        last_four: lastFour,
        exp_month: month,
        exp_year: '20' + year 
      });
      
      setView('LIST');
      setCardNumber('');
      setExpiry('');
      setCvc('');
    } catch (e) {
      console.error(e);
      alert("Ошибка добавления карты");
    } finally {
      setLoading(false);
    }
  };

  const detectedCard = cardValidator.number(cardNumber).card;
  const cardType = detectedCard ? detectedCard.type : '';

  const renderCardBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'visa') return <div className="font-bold text-lg italic text-blue-800 leading-none">VISA</div>;
    if (t === 'mastercard' || t === 'master-card') return (
        <div className="flex items-center">
            <div className="w-5 h-5 rounded-full bg-[#eb001b]"></div>
            <div className="w-5 h-5 rounded-full bg-[#f79e1b] -ml-2.5 mix-blend-multiply"></div>
        </div>
    );
    if (t === 'mir') return <div className="font-bold text-lg text-[#00773f] leading-none">МИР</div>;
    return <span className="text-sm font-bold text-gray-700">{type}</span>;
  };

  const renderList = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1a1a1a]">Способы оплаты</h2>
        <button 
          onClick={onClose} 
          className="transition-colors duration-300"
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseLeave={() => setIsCloseHovered(false)}
          style={{ color: isCloseHovered ? '#c9825b' : '#9ca3af' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {paymentMethods.map(pm => (
          <PaymentMethodRow key={pm.id} pm={pm} onDeleteCard={onDeleteCard} />
        ))}
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => setView('ADD_CARD')}
          onMouseEnter={() => setIsAddCardHovered(true)}
          onMouseLeave={() => setIsAddCardHovered(false)}
          className="w-full flex items-center justify-between p-4 rounded-xl transition-colors duration-300"
          style={{ backgroundColor: isAddCardHovered ? '#e5e7eb' : '#f9fafb' }}
        >
          <div className="flex items-center space-x-3 text-[#1a1a1a] font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Привязать карту</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button 
          onClick={() => setView('SBP')}
          onMouseEnter={() => setIsSbpHovered(true)}
          onMouseLeave={() => setIsSbpHovered(false)}
          className="w-full flex items-center justify-between p-4 rounded-xl transition-colors duration-300"
          style={{ backgroundColor: isSbpHovered ? '#e5e7eb' : '#f9fafb' }}
        >
          <div className="flex items-center space-x-3 text-[#1a1a1a] font-medium">
            {/* SBP Icon placeholder */}
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#c9825b"/>
              <path d="M2 17L12 22L22 17" stroke="#c9825b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#c9825b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Привязать счёт СБП</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <button 
        onClick={onClose}
        onMouseEnter={() => setIsSaveHovered(true)}
        onMouseLeave={() => setIsSaveHovered(false)}
        className="w-full mt-6 py-3.5 font-medium rounded-xl transition-all duration-300 border border-[#c9825b]"
        style={{
             backgroundColor: isSaveHovered ? '#c9825b' : '#ffffff',
             color: isSaveHovered ? '#ffffff' : '#c9825b'
        }}
      >
        Сохранить
      </button>
    </>
  );

  const renderAddCard = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => setView('LIST')} 
          className="transition-colors duration-300"
          onMouseEnter={() => setIsBackHovered(true)}
          onMouseLeave={() => setIsBackHovered(false)}
          style={{ color: isBackHovered ? '#c9825b' : '#9ca3af' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[#1a1a1a]">Привязка карты</h2>
        <button 
          onClick={onClose} 
          className="transition-colors duration-300"
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseLeave={() => setIsCloseHovered(false)}
          style={{ color: isCloseHovered ? '#c9825b' : '#9ca3af' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Card Icons */}
      <div className="flex space-x-4 mb-6 grayscale opacity-70">
        <div className={`font-bold text-xl italic text-blue-800 transition-all ${cardType === 'visa' ? 'grayscale-0 opacity-100 scale-110' : ''}`}>VISA</div>
        <div className={`font-bold text-xl text-red-500 flex items-center transition-all ${(cardType === 'mastercard' || cardType === 'master-card') ? 'grayscale-0 opacity-100 scale-110' : ''}`}>
            <div className="w-4 h-4 rounded-full bg-red-500 opacity-80"></div>
            <div className="w-4 h-4 rounded-full bg-yellow-500 opacity-80 -ml-2"></div>
        </div>
        <div className={`font-bold text-xl text-green-600 transition-all ${cardType === 'mir' ? 'grayscale-0 opacity-100 scale-110' : ''}`}>МИР</div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="relative">
            {cardType && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in">
                    {renderCardBadge(cardType)}
                </div>
            )}
            <IMaskInput 
              mask="0000 0000 0000 0000"
              placeholder={cardType ? "" : "Номер карты"}
              value={cardNumber}
              onAccept={(value: string) => setCardNumber(value)}
              className={`w-full p-3.5 bg-gray-50 rounded-xl border border-transparent focus:border-[#c9825b] outline-none focus:ring-1 focus:ring-[#c9825b] placeholder-gray-400 text-[#1a1a1a] transition-all ${cardType ? 'pl-16' : ''}`}
            />
        </div>
        <div className="flex space-x-4">
            <IMaskInput 
              mask="00/00"
              placeholder="ММ/ГГ"
              value={expiry}
              onAccept={(value: string) => setExpiry(value)}
              className="w-1/2 p-3.5 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#c9825b] placeholder-gray-400 text-[#1a1a1a]"
            />
            <div className="w-1/2 relative">
                <IMaskInput 
                  mask="000"
                  placeholder="CVV/CVC"
                  value={cvc}
                  onAccept={(value: string) => setCvc(value)}
                  type="password"
                  className="w-full p-3.5 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#c9825b] placeholder-gray-400 text-[#1a1a1a]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group cursor-help">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Три цифры на обороте карты
                        <div className="absolute top-100 right-2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <button 
        onClick={handleAddCardSubmit}
        disabled={loading}
        onMouseEnter={() => setIsBindHovered(true)}
        onMouseLeave={() => setIsBindHovered(false)}
        className="w-full py-3.5 font-medium rounded-xl transition-all duration-300 disabled:opacity-70 border border-[#c9825b]"
        style={{
             backgroundColor: isBindHovered ? '#c9825b' : '#ffffff',
             color: isBindHovered ? '#ffffff' : '#c9825b'
        }}
      >
        {loading ? 'Привязка...' : 'Привязать'}
      </button>

      <div className="mt-4 flex items-center justify-center text-gray-400 text-sm space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Данные карты надёжно защищены</span>
      </div>
    </>
  );

  const renderSBP = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => setView('LIST')} 
          className="transition-colors duration-300"
          onMouseEnter={() => setIsBackHovered(true)}
          onMouseLeave={() => setIsBackHovered(false)}
          style={{ color: isBackHovered ? '#c9825b' : '#9ca3af' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[#1a1a1a]">Отсканируйте QR-код</h2>
        <button 
          onClick={onClose} 
          className="transition-colors duration-300"
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseLeave={() => setIsCloseHovered(false)}
          style={{ color: isCloseHovered ? '#c9825b' : '#9ca3af' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="text-center text-gray-600 mb-8 px-4">
        Привязать счёт к СБП можно через приложение банка или камеру.
        <br />
        <span className="text-xs text-gray-400 block mt-2">
            (Примечание: QR-код генерируется на основе ссылки, полученной от банка через API. Здесь показан пример.)
        </span>
      </div>

      <div className="relative mx-auto w-64 h-64 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center mb-8">
        {/* Corner markers */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#c9825b] rounded-tl-xl -mt-1 -ml-1"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#c9825b] rounded-tr-xl -mt-1 -mr-1"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#c9825b] rounded-bl-xl -mb-1 -ml-1"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#c9825b] rounded-br-xl -mb-1 -mr-1"></div>

        {/* QR Code Placeholder */}
        <div className="bg-white p-2 rounded-xl flex items-center justify-center min-h-[196px]">
             {sbpLoading ? (
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9825b]"></div>
             ) : (
                 <div className="relative">
                    <QRCodeSVG 
                        value={sbpPayload || "https://sbp.nspk.ru/pay?id=123456789"} 
                        size={180}
                        level="M"
                        fgColor="#2d2d2d"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white/90 px-2 py-1 rounded text-xs font-bold text-[#c9825b] shadow-sm">
                            СБП
                        </div>
                    </div>
                 </div>
             )}
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        {view === 'LIST' && renderList()}
        {view === 'ADD_CARD' && renderAddCard()}
        {view === 'SBP' && renderSBP()}
      </div>
    </div>
  );
}