export interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

const MetaTags = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
  noIndex = false,
  noFollow = false
}: MetaTagsProps) => {
  const defaultTitle = 'HomeFood Marketplace - Домашняя еда с доставкой';
  const defaultDescription = 'HomeFood Marketplace - платформа для заказа домашней еды от частных поваров и кулинарных студий с доставкой или самовывозом.';
  const defaultKeywords = 'домашняя еда, доставка еды, заказ еды онлайн, готовая еда, кулинария, частные повара';

  const robotsContent = `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`;

  return (
    <>
      {/* Basic Meta Tags */}
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <meta name="robots" content={robotsContent} />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:site_name" content="HomeFood Marketplace" />
      <meta property="og:locale" content="ru_RU" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || defaultTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <meta name="twitter:site" content="@homefood" />

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#FF6B35" />
      <meta name="author" content="HomeFood Marketplace" />
    </>
  );
};

export default MetaTags;
