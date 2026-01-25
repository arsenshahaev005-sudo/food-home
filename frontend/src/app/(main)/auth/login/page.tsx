"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { login, verifyLogin2FA, resendCode, googleLogin } from "@/lib/authApi";
import { saveAuthTokens } from "@/lib/cookies";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "@/app/globals.css"; // Ensure global styles are available if needed for overrides
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("email");
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>("");
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState<"CLIENT" | "SELLER">("CLIENT");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [verificationCode, setVerificationCode] = useState("");
  const [maskedDestination, setMaskedDestination] = useState("");
  const [emailFor2FA, setEmailFor2FA] = useState("");

  const googleLoginAction = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        const res = await googleLogin(tokenResponse.access_token, role);
        saveAuthTokens(res.access, res.refresh || '', rememberMe);
        router.push("/profile");
        router.refresh();
      } catch (err: any) {
        setError(err?.detail || "Google login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login failed"),
  });

  useEffect(() => {
    if (searchParams.get("msg") === "exists") {
      setError("Пользователь уже существует. Пожалуйста, войдите.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const identifier = loginMethod === "phone" ? (phoneNumber || "") : email;

    try {
      const res = await login(identifier, password, role);
      
      if (res.requires_2fa) {
        setStep("2fa");
        // Store the identifier used for login (phone or email)
        // This ensures that resend code works with the correct identifier
        setEmailFor2FA(identifier);
        
        // If sent to phone, use the returned phone for masking
        if (res.sent_to === 'phone' && res.phone) {
             const phone = res.phone;
             const visibleStart = phone.length > 7 ? phone.substring(0, 5) : phone.substring(0, 2);
             const visibleEnd = phone.length > 4 ? phone.substring(phone.length - 4) : "";
             setMaskedDestination(`${visibleStart}***${visibleEnd}`);
        } else {
             const emailVal = res.email || (loginMethod === 'email' ? identifier : "");
             setMaskedDestination(emailVal ? emailVal.replace(/(.{2})(.*)(@.*)/, "$1***$3") : identifier);
        }
      } else if (res.access) {
        saveAuthTokens(res.access, res.refresh || '', rememberMe);
        
        if (res.role === 'SELLER') {
            router.push("/seller");
        } else {
            router.push("/profile");
        }
        router.refresh();
      }
    } catch (err: any) {
       setError(err?.detail || "Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await verifyLogin2FA(emailFor2FA, verificationCode);
      saveAuthTokens(res.access, res.refresh || '', rememberMe);
      
      if (res.role === 'SELLER') {
            router.push("/seller");
        } else {
            router.push("/profile");
        }
      router.refresh();
    } catch (err: any) {
      setError(err?.detail || "Неверный код");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    setError(null);
    try {
      await resendCode(emailFor2FA);
      alert("Код отправлен повторно");
    } catch (err: any) {
      setError(err?.detail || "Ошибка отправки кода");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Link href="/">
               <Image src="/logo.svg" alt="Food&Home" width={350} height={56} className="object-contain h-14 w-auto" />
            </Link>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight" style={{ color: "#4b2f23" }}>
            {step === "login" ? "Вход в аккаунт" : "Двухфакторная аутентификация"}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#7c6b62" }}>
            {step === "login" ? "Рады видеть вас снова" : `Введите код, отправленный на ${maskedDestination}`}
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
          {step === "login" && (
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
          )}

          {step === "login" ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>
                  {loginMethod === "phone" ? "Номер телефона" : "Email"}
                </label>
                <div className="mt-2 relative">
                  {loginMethod === "phone" ? (
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
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-full border-0 py-2.5 pl-10 pr-4 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                        placeholder="Введите email"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>
                  Пароль
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-full border-0 py-2.5 pl-10 pr-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                    placeholder="•••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#c9825b] transition-all duration-200 hover:scale-110 active:scale-90"
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
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center space-x-2"
                    aria-pressed={rememberMe}
                  >
                    <span className="text-sm text-gray-900">Запомнить меня</span>
                    <span
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 ease-in-out ${
                        rememberMe ? "bg-white border-[#c9825b]" : "bg-[#c9825b] border-[#c9825b]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                          rememberMe ? "translate-x-5 bg-[#c9825b]" : "translate-x-1 bg-white"
                        }`}
                      />
                    </span>
                  </button>

                  <div className="text-sm">
                    <Link 
                      href="/auth/forgot-password" 
                      className="font-medium hover:underline" 
                      style={{ color: "#c9825b" }}
                    >
                      Забыли пароль?
                    </Link>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-warm w-full text-sm font-semibold shadow-sm disabled:opacity-70"
                >
                  {loading ? "Вход..." : "Войти"}
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Или войдите через</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <button
                  type="button"
                  onClick={() => setLoginMethod(loginMethod === "phone" ? "email" : "phone")}
                  className="flex w-full items-center justify-center rounded-full bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-[#c9825b] hover:text-white hover:ring-[#c9825b] hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9825b] group"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  {loginMethod === "phone" ? (
                    <>
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-gray-500 transition-colors duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      Email
                    </>
                  ) : (
                    <>
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-gray-500 transition-colors duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                      Телефон
                    </>
                  )}
                </button>
              </div>
              
              <div className="text-center text-sm">
                <Link href="/auth/register" className="font-medium hover:underline" style={{ color: "#c9825b" }}>
                  Нет аккаунта? Зарегистрироваться
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerify2FA}>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>
                  Код подтверждения
                </label>
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
               
               <div className="text-center mt-2">
                 <button
                   type="button"
                   onClick={() => setStep("login")}
                   className="text-sm text-gray-500 hover:text-gray-700"
                 >
                   Назад к входу
                 </button>
               </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </GoogleOAuthProvider>
  );
}
