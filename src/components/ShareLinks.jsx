/**
 * Share Links Component
 *
 * Provides a prominent "Share" button with Web Share API on supported mobile,
 * and a fallback dropdown (Copy link, Twitter, LinkedIn) with 44px+ touch targets.
 */
import React, { useState, useRef, useEffect } from 'react';

const touchTargetClass = 'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors';
const iconClass = 'w-5 h-5 sm:w-6 sm:h-6';

export default function ShareLinks({ url, title, description = '' }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || '';
  const shareText = description || title || '';
  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const handleNativeShare = async () => {
    if (!canNativeShare || !shareUrl) return;
    try {
      await navigator.share({
        url: shareUrl,
        title: shareTitle || 'Archetype Original',
        text: shareText || shareTitle
      });
      setDropdownOpen(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setDropdownOpen(true);
      }
    }
  };

  const handleSocialShare = (platform) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const encodedText = encodeURIComponent(shareText);

    let shareWindowUrl = '';
    switch (platform) {
      case 'twitter':
        shareWindowUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'linkedin':
        shareWindowUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'facebook':
        shareWindowUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      default:
        return;
    }
    if (shareWindowUrl) {
      window.open(shareWindowUrl, '_blank', 'width=600,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
    }
    setDropdownOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      setDropdownOpen(false);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const onShareClick = () => {
    if (canNativeShare) {
      handleNativeShare();
    } else {
      setDropdownOpen((prev) => !prev);
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={onShareClick}
        className={`${touchTargetClass} flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] border border-[#E5E5E5] hover:border-[#D0D0D0]`}
        aria-label="Share"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="hidden sm:inline">Share</span>
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border border-[#E5E5E5] bg-white py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            onClick={handleCopyLink}
            className={`${touchTargetClass} w-full gap-2 px-4 text-left text-sm`}
            role="menuitem"
          >
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {linkCopied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => handleSocialShare('twitter')}
            className={`${touchTargetClass} w-full gap-2 px-4 text-left text-sm`}
            role="menuitem"
          >
            <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            Twitter
          </button>
          <button
            type="button"
            onClick={() => handleSocialShare('linkedin')}
            className={`${touchTargetClass} w-full gap-2 px-4 text-left text-sm`}
            role="menuitem"
          >
            <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </button>
        </div>
      )}
    </div>
  );
}
