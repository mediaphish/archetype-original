/**
 * OptimizedImage – lazy loading, async decode, optional dimensions to avoid layout shift.
 * Use for photos/avatars; logos can use loading="eager".
 */
import React from 'react';

export function OptimizedImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  width,
  height,
  ...rest
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      width={width}
      height={height}
      {...rest}
    />
  );
}
