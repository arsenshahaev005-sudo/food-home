"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { register, verifyRegistration, resendCode, googleLogin } from "@/lib/authApi";
import { saveAuthTokens } from "@/lib/cookies";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    shop_name: "",
  });
  const [role, setRole] = useState<"CLIENT" | "SELLER">("CLIENT");
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>("");

  useEffect(() => {
    setFormData(prev => ({ ...prev, phone: phoneNumber || "" }));
  }, [phoneNumber]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleLoginAction = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        const res = await googleLogin(tokenResponse.access_token, role);
        saveAuthTokens(res.access, res.refresh || '', false);
        router.push("/profile");
        router.refresh();
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.detail || "Google login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login failed"),
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role,
        first_name: formData.first_name,
        shop_name: role === 'SELLER' ? formData.shop_name : undefined,
      });
      setStep("verify");
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.code === 'producer_exists') {
         // Already a seller -> login
         router.push("/auth/login?msg=exists");
         return;
      }
      if (err?.code === 'user_exists_client') {
          // User exists, but trying to register as client (or forgot to select seller)
          setError(err.detail);
          return;
      }
      if (err?.code === 'phone_exists') {
          setError("Этот номер телефона уже используется другим пользователем.");
          return;
      }
      if (err?.code === 'phone_exists_diff_email') {
          setError(err.detail);
          return;
      }

      if (err?.code === 'user_exists' || err?.detail === 'User already exists' || err?.detail === 'Phone already exists') {
         // Redirect to login if user already exists
         router.push("/auth/login?msg=exists");
         return;
      }
      setError(err?.detail || "Ошибка регистрации. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationCode) {
      setError("Введите код подтверждения");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyRegistration(formData.email, verificationCode);
      saveAuthTokens(res.access, res.refresh || '', false);
      if (res.role === 'SELLER') {
            router.push("/seller");
        } else {
            router.push("/profile");
        }
      router.refresh();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any)?.detail || "Неверный код подтверждения");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    setError(null);
    try {
      await resendCode(formData.email);
      alert("Код отправлен повторно");
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any)?.detail || "Ошибка отправки кода");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight" style={{ color: "#4b2f23" }}>
            Регистрация
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#7c6b62" }}>
            Создайте аккаунт, чтобы сохранять адреса и историю заказов
          </p>
        </div>
        
        <div 
          className="p-8 rounded-3xl"
          style={{ 
            backgroundColor: "#fff", 
            boxShadow: "var(--shadow-soft)",
            border: "1px solid var(--border-warm)" 
          }}
        >
          {step === "form" ? (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div className="flex gap-3 mb-6">
                  <div 
                    onClick={() => setRole("CLIENT")}
                    className={`flex-1 p-3 rounded-2xl border cursor-pointer transition-all ${
                        role === "CLIENT" 
                        ? "border-[#c9825b] bg-[#fff5f0]" 
                        : "border-gray-200 hover:border-[#c9825b]/50"
                    }`}
                  >
                      <div className="font-semibold text-gray-900 text-sm">Я покупатель</div>
                      <div className="text-xs text-gray-500 mt-1">Заказывайте еду</div>
                  </div>
                  <div 
                    onClick={() => setRole("SELLER")}
                    className={`flex-1 p-3 rounded-2xl border cursor-pointer transition-all ${
                        role === "SELLER" 
                        ? "border-[#c9825b] bg-[#fff5f0]" 
                        : "border-gray-200 hover:border-[#c9825b]/50"
                    }`}
                  >
                      <div className="font-semibold text-gray-900 text-sm">Я продавец</div>
                      <div className="text-xs text-gray-500 mt-1">Продавайте блюда</div>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Имя</label>
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                  />
                </div>
              </div>

              {role === 'SELLER' && (
                <div>
                  <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Название магазина</label>
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      value={formData.shop_name}
                      onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
                      className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Email</label>
                <div className="mt-2">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Номер телефона</label>
                <div className="mt-2 relative">
                  <div className="rounded-full shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#c9825b] bg-transparent">
                    <PhoneInput
                      international
                      defaultCountry="RU"
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      className="phone-input-custom px-4 py-2.5 w-full bg-transparent"
                      placeholder="Номер телефона"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Пароль</label>
                <div className="mt-2 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#c9825b] transition-all duration-200 hover:scale-110 active:scale-90"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 transition-opacity duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 transition-opacity duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Подтвердите пароль</label>
                <div className="mt-2 relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#c9825b] transition-all duration-200 hover:scale-110 active:scale-90"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 transition-opacity duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 transition-opacity duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn-warm w-full text-sm font-semibold shadow-sm disabled:opacity-70"
              >
                {loading ? "Загрузка..." : "Продолжить"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Или зарегистрируйтесь через</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => googleLoginAction()}
                  className="flex w-full items-center justify-center rounded-full bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-[#c9825b] hover:text-white hover:ring-[#c9825b] hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9825b]"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12.0003 20.45C16.6366 20.45 20.5085 17.2716 21.932 13.1118H12.0003V9.75293H22.3734C22.5029 10.4357 22.5645 11.1378 22.5645 11.8389C22.5645 18.0673 17.8385 22.8029 12.0003 22.8029C6.03433 22.8029 1.19727 17.9659 1.19727 12.0001C1.19727 6.03433 6.03433 1.19727 12.0003 1.19727C14.7766 1.19727 17.1891 2.1627 19.0661 3.73836L16.4883 6.31611C15.6558 5.64188 14.122 4.79373 12.0003 4.79373C8.15611 4.79373 4.9608 7.82864 4.9608 12.0001C4.9608 16.1716 8.15611 19.2065 12.0003 19.2065Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M21.932 13.1118C21.7397 12.5298 21.4924 11.9702 21.1983 11.4443H12.0003V9.75293H22.3734C21.9563 12.2857 20.6725 14.5383 18.8953 16.1953L16.2736 14.175C15.1189 15.068 13.6548 15.6565 12.0003 15.6565V19.2065V20.45C16.6366 20.45 20.5085 17.2716 21.932 13.1118Z"
                      fill="#34A853"
                    />
                  </svg>
                  Google
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerify}>
               <div className="text-center text-sm mb-4">
                Мы отправили код подтверждения на <b>{formData.email}</b>
              </div>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Код из Email</label>
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b] text-center tracking-widest text-lg"
                  />
                </div>
              </div>

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn-warm w-full text-sm font-semibold shadow-sm disabled:opacity-70"
              >
                {loading ? "Проверка..." : "Подтвердить"}
              </button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "#c9825b" }}
                >
                  Отправить код повторно
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <RegisterForm />
    </GoogleOAuthProvider>
  );
}
