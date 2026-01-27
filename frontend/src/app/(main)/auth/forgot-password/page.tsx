"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestPasswordReset, resetPassword } from "@/lib/api";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("email");
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
      try {
      const identifier = loginMethod === "phone" ? (phoneNumber || "") : email;
      await requestPasswordReset(identifier);
      setStep("reset");
      setSuccess(loginMethod === "phone" ? "Код отправлен на ваш номер телефона" : "Код для сброса пароля отправлен на вашу почту");
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any)?.detail || "Ошибка при запросе сброса пароля");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const identifier = loginMethod === "phone" ? (phoneNumber || "") : email;
      await resetPassword(identifier, code, newPassword);
      setSuccess("Пароль успешно изменен");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any)?.detail || "Ошибка при сбросе пароля");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const identifier = loginMethod === "phone" ? (phoneNumber || "") : email;
      await requestPasswordReset(identifier);
      setSuccess(loginMethod === "phone" ? "Код отправлен на ваш номер телефона" : "Код для сброса пароля отправлен на вашу почту");
      setResendCooldown(60);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any)?.detail || "Не удалось отправить код повторно");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight" style={{ color: "#4b2f23" }}>
            Восстановление пароля
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#7c6b62" }}>
            {step === "request" 
              ? "Введите email или номер телефона для получения кода" 
              : loginMethod === "phone" ? "Введите код из SMS и новый пароль" : "Введите код из письма и новый пароль"}
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
          {step === "request" ? (
            <form className="space-y-6" onSubmit={handleRequest}>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>
                  {loginMethod === "email" ? "Email" : "Номер телефона"}
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
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                    />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-full px-3 py-2.5 text-sm font-semibold leading-6 shadow-sm bg-white text-gray-900 ring-1 ring-inset ring-gray-300"
                style={{ boxShadow: "var(--shadow-soft)", transition: "background-color 200ms ease, color 200ms ease, box-shadow 200ms ease, border-color 200ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9825B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#C9825B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
              >
                {loading ? "Отправка..." : "Отправить код"}
              </button>

              <button
                type="button"
                onClick={() => setLoginMethod(loginMethod === "phone" ? "email" : "phone")}
                className="flex w-full items-center justify-center rounded-full bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
                style={{ boxShadow: "var(--shadow-soft)", transition: "background-color 200ms ease, color 200ms ease, box-shadow 200ms ease, border-color 200ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9825B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#C9825B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
              >
                {loginMethod === "phone" ? "Использовать Email" : "Использовать телефон"}
              </button>

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              {success && <div className="text-green-500 text-sm text-center">{success}</div>}
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleReset}>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>{loginMethod === "phone" ? "Код из SMS" : "Код из Email"}</label>
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b] text-center tracking-widest text-lg"
                  />
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  className="text-sm font-medium"
                  style={{ color: resendCooldown > 0 ? "#9ca3af" : "#c9825b" }}
                >
                  {resendCooldown > 0 ? `Отправить код повторно через ${resendCooldown}с` : "Отправить код повторно"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: "#4b2f23" }}>Новый пароль</label>
                <div className="mt-2 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-full border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#c9825b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              {success && <div className="text-green-500 text-sm text-center">{success}</div>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-full px-3 py-2.5 text-sm font-semibold leading-6 shadow-sm disabled:opacity-70"
                style={{ backgroundColor: "#fff", color: "#1a1a1a", boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-warm)", transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9825B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#C9825B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = 'var(--border-warm)'; }}
              >
                {loading ? "Сохранение..." : "Изменить пароль"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/auth/login" className="font-medium hover:underline" style={{ color: "#c9825b" }}>
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
