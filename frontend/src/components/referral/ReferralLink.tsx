/**
 * Компонент реферальной ссылки.
 * 
 * Обоснование: Удобный компонент для шаринга
 * реферальной ссылки через социальные сети.
 */

import React, { useState } from 'react';

interface ReferralLinkProps {
  referralLink: string;
  onShare: (_platform: string) => void; // eslint-disable-line no-unused-vars
}

export const ReferralLink: React.FC<ReferralLinkProps> = ({
  referralLink,
  onShare,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(referralLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`,
      vk: `https://vk.com/share.php?url=${encodeURIComponent(referralLink)}`,
    };
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
      onShare(platform);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Пригласить друзей
      </h2>

      {/* Copy link */}
      <div className="mb-6">
        <label htmlFor="referral-link" className="block text-sm font-medium text-gray-700 mb-2">
          Ваша реферальная ссылка
        </label>
        <div className="flex gap-2">
          <input
            id="referral-link"
            type="text"
            value={referralLink}
            readOnly
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
            aria-label="Реферальная ссылка"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Копировать ссылку"
            type="button"
          >
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Поделиться через:
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* WhatsApp */}
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex flex-col items-center justify-center p-4 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            aria-label="Поделиться через WhatsApp"
            type="button"
          >
            <span className="text-2xl mb-1">📱</span>
            <span className="text-sm font-medium">WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={() => handleShare('telegram')}
            className="flex flex-col items-center justify-center p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            aria-label="Поделиться через Telegram"
            type="button"
          >
            <span className="text-2xl mb-1">✈️</span>
            <span className="text-sm font-medium">Telegram</span>
          </button>

          {/* VK */}
          <button
            onClick={() => handleShare('vk')}
            className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            aria-label="Поделиться через VK"
            type="button"
          >
            <span className="text-2xl mb-1">📢</span>
            <span className="text-sm font-medium">VK</span>
          </button>

          {/* Email */}
          <button
            onClick={() => {
              const subject = encodeURIComponent('Присоединяйся к HomeFood Marketplace!');
              const body = encodeURIComponent(`Привет! Присоединяйся к HomeFood Marketplace по моей реферальной ссылке: ${referralLink}`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
            className="flex flex-col items-center justify-center p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            aria-label="Поделиться через Email"
            type="button"
          >
            <span className="text-2xl mb-1">✉️</span>
            <span className="text-sm font-medium">Email</span>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 rounded-md p-4">
        <h4 className="font-medium text-gray-900 mb-2">
          💰 Как вы получаете бонусы?
        </h4>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>
            Когда друг регистрируется по вашей ссылке, вы получаете бонус
          </li>
          <li>
            Когда друг делает первый заказ, вы получаете дополнительный бонус
          </li>
          <li>
            Ваш друг также получает бонус за регистрацию!
          </li>
        </ul>
      </div>
    </div>
  );
};
