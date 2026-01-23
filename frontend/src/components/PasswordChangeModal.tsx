"use client";

import { useState, useEffect } from "react";
import { requestChange } from "@/lib/api";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16.01C14.2091 16.01 16 14.2191 16 12.01C16 9.80087 14.2091 8.01001 12 8.01001C9.79086 8.01001 8 9.80087 8 12.01C8 14.2191 9.79086 16.01 12 16.01Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 11.98C8.09 1.31996 15.91 1.32996 22 11.98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 12.01C15.91 22.67 8.09 22.66 2 12.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.83 9.17999C14.2706 8.61995 13.5576 8.23846 12.7813 8.08386C12.0049 7.92926 11.2002 8.00851 10.4689 8.31152C9.73758 8.61453 9.11264 9.12769 8.67316 9.78607C8.23367 10.4444 7.99938 11.2184 8 12.01C7.99916 13.0663 8.41619 14.08 9.16004 14.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16.01C13.0609 16.01 14.0783 15.5886 14.8284 14.8384C15.5786 14.0883 16 13.0709 16 12.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.61 6.39004L6.38 17.62C4.6208 15.9966 3.14099 14.0944 2 11.99C6.71 3.76002 12.44 1.89004 17.61 6.39004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.9994 3L17.6094 6.39" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.38 17.62L3 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.5695 8.42999C20.4801 9.55186 21.2931 10.7496 21.9995 12.01C17.9995 19.01 13.2695 21.4 8.76953 19.23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PasswordChangeModal({ isOpen, onClose, token }: PasswordChangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility State
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Validation State
  const [validations, setValidations] = useState({
    length: false,
    match: false,
  });

  // Hover State
  const [isContinueHovered, setIsContinueHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      // Reset state on open
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(false);
      setValidations({
        length: false,
        match: false,
      });
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  // Real-time validation
  useEffect(() => {
    setValidations({
      length: newPassword.length >= 6,
      match: newPassword === confirmPassword && newPassword !== '',
    });
  }, [newPassword, confirmPassword]);

  const isValid = Object.values(validations).every(Boolean) && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
        if (!validations.length) setError("Пароль должен содержать минимум 6 символов");
        else if (!validations.match) setError("Пароли не совпадают");
        else if (currentPassword.length === 0) setError("Введите текущий пароль");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      await requestChange('PASSWORD', newPassword, token, {
        old_password: currentPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
        let msg = "Ошибка при смене пароля";
        if (err?.detail) msg = err.detail;
        else if (Array.isArray(err)) msg = err.join(', ');
        else if (typeof err === 'object') {
            const vals = Object.values(err);
            if (vals.length > 0) msg = String(vals[0]);
        }
        setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[warmFadeIn_0.3s_ease-out]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8dccf] flex justify-between items-center bg-[#fcf8f3]">
          <h3 className="text-xl font-bold text-[#4b2f23]">Смена пароля</h3>
          {!success && (
            <button 
                onClick={onClose} 
                onMouseEnter={() => setIsCloseHovered(true)}
                onMouseLeave={() => setIsCloseHovered(false)}
                className="transition-all duration-300 p-1"
                style={{ color: isCloseHovered ? '#c9825b' : '#9ca3af' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-[#4b2f23] mb-2">Пароль успешно изменен!</h4>
              <p className="text-gray-500">Окно закроется автоматически...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-start">
                   <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#4b2f23]">Текущий пароль</label>
                <div className="relative group">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-[#4b2f23] focus:border-[#c9825b] focus:ring-2 focus:ring-[#c9825b]/20 outline-none transition-all pr-12"
                    placeholder="Введите текущий пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#c9825b] transition-all hover:scale-110"
                  >
                    {showCurrent ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#4b2f23]">Новый пароль</label>
                <div className="relative group">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-[#4b2f23] focus:border-[#c9825b] focus:ring-2 focus:ring-[#c9825b]/20 outline-none transition-all pr-12"
                    placeholder="Минимум 6 символов"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#c9825b] transition-all hover:scale-110"
                  >
                    {showNew ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Validation Indicators - Removed as requested */}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#4b2f23]">Подтверждение</label>
                <div className="relative group">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`block w-full rounded-full border ${validations.match ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'} px-4 py-3 text-[#4b2f23] focus:border-[#c9825b] focus:ring-2 focus:ring-[#c9825b]/20 outline-none transition-all pr-12`}
                    placeholder="Повторите новый пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#c9825b] transition-all hover:scale-110"
                  >
                    {showConfirm ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {!validations.match && confirmPassword.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">Пароли не совпадают</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  onMouseEnter={() => setIsContinueHovered(true)}
                  onMouseLeave={() => setIsContinueHovered(false)}
                  style={{
                    backgroundColor: loading ? '#fcf8f3' : (isContinueHovered ? '#c9825b' : '#fcf8f3'),
                    color: loading ? '#c9825b' : (isContinueHovered ? '#ffffff' : '#4b2f23'),
                  }}
                  className="w-full font-medium py-3.5 rounded-full shadow-md transition-all duration-300 ease-in-out active:scale-[0.98] flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-[#c9825b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Продолжить'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
