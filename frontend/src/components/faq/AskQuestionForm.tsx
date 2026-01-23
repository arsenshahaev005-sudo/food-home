import React, { useState } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import { submitQuestion } from '@/lib/api/faqApi';

interface AskQuestionFormProps {
  token: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AskQuestionForm: React.FC<AskQuestionFormProps> = ({ token, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    question: '',
    category: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const categories = [
    'Доставка',
    'Оплата',
    'Возврат',
    'Заказ',
    'Аккаунт',
    'Другое',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Пожалуйста, введите ваше имя';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Пожалуйста, введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Пожалуйста, введите корректный email';
    }

    if (!formData.question.trim()) {
      newErrors.question = 'Пожалуйста, введите ваш вопрос';
    } else if (formData.question.trim().length < 10) {
      newErrors.question = 'Вопрос должен содержать минимум 10 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await submitQuestion(formData, token);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting question:', error);
      if (error.response?.data?.errors) {
        const serverErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(([key, value]: [string, any]) => {
          serverErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(serverErrors);
      } else {
        setErrors({ submit: 'Произошла ошибка при отправке вопроса. Пожалуйста, попробуйте снова.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      question: '',
      category: '',
    });
    setErrors({});
    setSubmitSuccess(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Задать вопрос</h2>
      <p className="text-gray-600 mb-6">
        Не нашли ответ на свой вопрос? Напишите нам, и мы ответим в ближайшее время.
      </p>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Вопрос отправлен!</p>
            <p className="text-sm text-green-700">Мы ответим вам в ближайшее время.</p>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Имя <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ваше имя"
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="your@email.com"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Категория вопроса
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Выберите категорию (опционально)</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Question */}
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
            Ваш вопрос <span className="text-red-500">*</span>
          </label>
          <textarea
            id="question"
            name="question"
            value={formData.question}
            onChange={handleInputChange}
            rows={5}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.question ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Опишите ваш вопрос подробно..."
            aria-required="true"
            aria-invalid={!!errors.question}
            aria-describedby={errors.question ? 'question-error' : undefined}
          />
          {errors.question && (
            <p id="question-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.question}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            aria-busy={isSubmitting}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Отправка...' : 'Отправить вопрос'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Очистить
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-gray-600 font-medium hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AskQuestionForm;
