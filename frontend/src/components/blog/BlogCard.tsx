'use client';

import React from 'react';
import Image from 'next/image';
import { Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';

export interface BlogCardProps {
  title: string;
  excerpt: string;
  image: string;
  author: string;
  authorAvatar?: string;
  date: string;
  readTime: string;
  category: string;
  slug: string;
}

const BlogCard = ({
  title,
  excerpt,
  image,
  author,
  authorAvatar,
  date,
  readTime,
  category,
  slug,
}: BlogCardProps) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = `/blog/${slug}`;
    }
  };

  return (
    <article
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group"
      role="article"
      aria-labelledby={`blog-card-title-${slug}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw"
        />

        {/* Category Badge */}
        {category && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-full shadow-md">
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Meta */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <time dateTime={date}>{formatDate(date)}</time>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{readTime}</span>
          </div>
        </div>

        {/* Title */}
        <h3
          id={`blog-card-title-${slug}`}
          className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-orange-500 transition-colors duration-200"
        >
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-gray-600 leading-relaxed mb-4 line-clamp-3">
          {excerpt}
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          {authorAvatar ? (
            <Image
              src={authorAvatar}
              alt={author}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{author}</p>
            <p className="text-xs text-gray-500">Автор блога</p>
          </div>
        </div>
      </div>

      {/* Link Overlay */}
      <Link
        href={`/blog/${slug}`}
        className="absolute inset-0 z-10"
        aria-label={`Читать статью: ${title}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <span className="sr-only">Читать статью: {title}</span>
      </Link>
    </article>
  );
};

export default BlogCard;
