import React from 'react';
import JournalMarkdownBody from '../JournalMarkdownBody';

export const GUEST_INTAKE_QUESTIONS = [
  {
    key: 'question_1',
    text: "What's something people get wrong about you?",
  },
  {
    key: 'question_2',
    text: "Where are you right now that you didn't expect to be five years ago?",
  },
  {
    key: 'question_3',
    text: "What's a story from your life you think about more than people would guess?",
  },
  {
    key: 'question_4',
    text: 'What are you into right now? Books, shows, hobbies, whatever.',
  },
  {
    key: 'question_5',
    text: 'What else do you want us to know?',
  },
];

function guestInitials(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function linkButtonClassName() {
  return 'w-8 h-8 flex items-center justify-center border border-[#1A1A1A]/10 text-[#6B6B6B] hover:border-[#DB0812] hover:text-[#DB0812] transition-colors';
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 014 9 14.5 14.5 0 01-4 9 14.5 14.5 0 01-4-9 14.5 14.5 0 014-9z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.78 1.52V6.82a4.85 4.85 0 01-1.01-.13z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

const PLATFORM_META = {
  instagram: { label: 'Instagram', Icon: InstagramIcon },
  linkedin: { label: 'LinkedIn', Icon: LinkedInIcon },
  twitter: { label: 'X', Icon: TwitterIcon },
  youtube: { label: 'YouTube', Icon: YouTubeIcon },
  tiktok: { label: 'TikTok', Icon: TikTokIcon },
  facebook: { label: 'Facebook', Icon: FacebookIcon },
  other: { label: 'Link', Icon: LinkIcon },
};

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function PodcastGuestSubmissionContent({ guest, showPrivateNotice = false, showAdminFields = false }) {
  if (!guest?.name) return null;

  const website = String(guest.website || '').trim();
  const image = String(guest.image_url || '').trim();
  const bio = String(guest.bio_md || '').trim();
  const socialLinks = Array.isArray(guest.social_links)
    ? guest.social_links.filter((row) => row?.platform && row?.url)
    : [];
  const hasLinks = Boolean(website) || socialLinks.length > 0;

  return (
    <div className="space-y-10">
      <div className="flex items-start gap-5">
        {image ? (
          <div className="h-24 w-24 shrink-0 overflow-hidden bg-[#E1DED8] sm:h-28 sm:w-28">
            <img src={image} alt={guest.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E1DED8] font-serif text-lg font-bold text-[#8B7D72]">
            {guestInitials(guest.name)}
          </div>
        )}

        <div>
          <h1 className="font-serif text-[clamp(28px,3.5vw,40px)] font-normal leading-tight text-[#1A1A1A]">
            {guest.name}
          </h1>
          {guest.company && <p className="mt-1 text-[#6B6B6B]">{guest.company}</p>}

          {showAdminFields && (
            <div className="mt-3 space-y-1 font-sans text-[13px] text-[#6B6B6B]">
              {guest.email && <p>Email: {guest.email}</p>}
              {guest.phone && (
                <p>
                  Phone: {guest.phone}
                  {guest.text_ok ? ' (okay to text)' : ''}
                </p>
              )}
              {guest.submitted_at && <p>Submitted: {formatDate(guest.submitted_at)}</p>}
            </div>
          )}

          {hasLinks && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className={linkButtonClassName()}
                >
                  <GlobeIcon />
                </a>
              )}
              {socialLinks.map((link) => {
                const meta = PLATFORM_META[link.platform] || PLATFORM_META.other;
                const { label, Icon } = meta;
                return (
                  <a
                    key={`${link.platform}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={linkButtonClassName()}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {bio && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-[#1A1A1A]">Bio</h2>
          <div className="prose prose-neutral max-w-none text-base leading-relaxed text-[#1A1A1A]">
            <JournalMarkdownBody post={{ body: bio }} />
          </div>
        </section>
      )}

      <section className="space-y-8">
        <h2 className="font-serif text-xl text-[#1A1A1A]">Your answers</h2>
        {GUEST_INTAKE_QUESTIONS.map((q) => {
          const answer = String(guest[q.key] || '').trim();
          if (!answer) return null;
          return (
            <div key={q.key} className="border border-[#1A1A1A]/08 bg-white p-6">
              <p className="mb-3 font-sans text-[15px] font-medium leading-snug text-[#1A1A1A]">{q.text}</p>
              <p className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-[#6B6B6B]">{answer}</p>
            </div>
          );
        })}
      </section>

      {guest.suggested_questions && (
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-xl text-[#1A1A1A]">Possible questions</h2>
            <p className="mt-1 font-sans text-[13px] text-[#6B6B6B]">
              A preview of what might come up. The conversation will be a real one — this is just so you can walk in
              prepared.
            </p>
          </div>

          {Array.isArray(guest.suggested_questions.person_specific) &&
            guest.suggested_questions.person_specific.length > 0 && (
              <div className="space-y-3">
                {guest.suggested_questions.person_specific.map((q, i) => (
                  <div key={`ps-${i}`} className="border border-[#1A1A1A]/08 bg-white p-5">
                    <p className="font-sans text-[14px] leading-relaxed text-[#1A1A1A]">{q.question}</p>
                  </div>
                ))}
              </div>
            )}

          {Array.isArray(guest.suggested_questions.ao_theology) &&
            guest.suggested_questions.ao_theology.length > 0 && (
              <div className="space-y-3">
                {guest.suggested_questions.ao_theology.map((q, i) => (
                  <div key={`at-${i}`} className="border border-[#1A1A1A]/08 bg-white p-5">
                    <p className="font-sans text-[14px] leading-relaxed text-[#1A1A1A]">{q.question}</p>
                  </div>
                ))}
              </div>
            )}
        </section>
      )}

      {showPrivateNotice && (
        <p className="border-t border-[#1A1A1A]/10 pt-6 font-sans text-[13px] text-[#6B6B6B]">
          This page is private. Only you and Bart can see it.
        </p>
      )}
    </div>
  );
}
