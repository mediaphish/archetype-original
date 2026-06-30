/**
 * Public podcast guest intake form.
 */
import React, { useEffect, useRef, useState } from 'react';
import SEO from '../components/SEO';

const BIO_MAX = 5000;

const SOCIAL_FIELDS = [
  { key: 'social_instagram', label: 'Instagram', placeholder: 'instagram.com/username' },
  { key: 'social_linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/yourname' },
  { key: 'social_twitter', label: 'X / Twitter', placeholder: 'x.com/username' },
  { key: 'social_youtube', label: 'YouTube', placeholder: 'youtube.com/@yourchannel' },
  { key: 'social_tiktok', label: 'TikTok', placeholder: 'tiktok.com/@username' },
  { key: 'social_facebook', label: 'Facebook', placeholder: 'facebook.com/yourpage' },
  { key: 'social_other', label: 'Anything else', placeholder: 'https://' },
];

const GUEST_QUESTIONS = [
  {
    key: 'question_1',
    number: '01',
    text: "What's something people get wrong about you?",
    placeholder: 'A sentence is plenty. A story is great too.',
  },
  {
    key: 'question_2',
    number: '02',
    text: "Where are you right now that you didn't expect to be five years ago?",
    placeholder: 'A sentence is plenty. A story is great too.',
  },
  {
    key: 'question_3',
    number: '03',
    text: "What's a story from your life you think about more than people would guess?",
    placeholder: 'A sentence is plenty. A story is great too.',
  },
  {
    key: 'question_4',
    number: '04',
    text: 'What are you into right now? Books, shows, hobbies, whatever.',
    placeholder: 'A sentence is plenty. A story is great too.',
  },
  {
    key: 'question_5',
    number: '05',
    text: 'What else do you want us to know?',
    placeholder: "Anything that didn't fit above.",
  },
];

const TRUST_ITEMS = [
  'About five minutes',
  'Sent directly to Bart',
  'Builds your episode page',
  "You'll get a copy to reference",
];

const inputClass =
  'w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none';

const textareaClass =
  'w-full resize-y border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3.5 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none';

export default function PodcastGuestIntake() {
  const formLoadedAtRef = useRef(null);
  const fileInputRef = useRef(null);
  const [trapField, setTrapField] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    textOk: false,
    website: '',
    company: '',
    bio_md: '',
    question_1: '',
    question_2: '',
    question_3: '',
    question_4: '',
    question_5: '',
    release_agreed: false,
    social_instagram: '',
    social_linkedin: '',
    social_twitter: '',
    social_youtube: '',
    social_tiktok: '',
    social_facebook: '',
    social_other: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploadStatus, setImageUploadStatus] = useState('idle');
  const [dragActive, setDragActive] = useState(false);

  const [formStatus, setFormStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  useEffect(() => {
    if (formLoadedAtRef.current == null) formLoadedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadImageFile = async (file) => {
    if (!file) return;
    const mime = file.type || 'image/jpeg';
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
      setFormStatus({ loading: false, success: false, error: 'Use a JPG or PNG image up to 10MB.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormStatus({ loading: false, success: false, error: 'Image must be 10MB or smaller.' });
      return;
    }

    setImageUploadStatus('uploading');
    setFormStatus((prev) => ({ ...prev, error: null }));

    try {
      const mint = await fetch('/api/podcast/guest-intake-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, mime_type: mime }),
      });
      const mintJson = await mint.json().catch(() => ({}));
      if (!mint.ok || !mintJson.ok) throw new Error(mintJson.error || 'Could not start image upload');

      const put = await fetch(mintJson.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': mime,
          'x-upsert': 'true',
        },
        body: file,
      });
      if (!put.ok) throw new Error(`Image upload failed (${put.status}).`);

      setImageFile(file);
      setImageUrl(mintJson.public_url || '');
      setImagePreview(URL.createObjectURL(file));
      setImageUploadStatus('done');
    } catch (err) {
      setImageUploadStatus('error');
      setFormStatus({ loading: false, success: false, error: err.message || 'Image upload failed' });
    }
  };

  const handleImageSelect = (file) => {
    if (file) uploadImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });

    if (!formData.name.trim() || !formData.email.trim() || !formData.release_agreed) {
      setFormStatus({
        loading: false,
        success: false,
        error: 'Name, email, and release agreement are required.',
      });
      return;
    }

    if (imageUploadStatus === 'uploading') {
      setFormStatus({
        loading: false,
        success: false,
        error: 'Please wait for your image to finish uploading.',
      });
      return;
    }

    try {
      const social_links = [
        { platform: 'instagram', url: formData.social_instagram },
        { platform: 'linkedin', url: formData.social_linkedin },
        { platform: 'twitter', url: formData.social_twitter },
        { platform: 'youtube', url: formData.social_youtube },
        { platform: 'tiktok', url: formData.social_tiktok },
        { platform: 'facebook', url: formData.social_facebook },
        { platform: 'other', url: formData.social_other },
      ]
        .filter((row) => row.url.trim())
        .map((row) => ({
          ...row,
          url: /^https?:\/\//i.test(row.url.trim())
            ? row.url.trim()
            : `https://${row.url.trim()}`,
        }));

      const res = await fetch('/api/podcast/guest-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          text_ok: formData.textOk,
          bio_md: formData.bio_md.slice(0, BIO_MAX),
          image_url: imageUrl,
          social_links,
          form_loaded_at: formLoadedAtRef.current,
          _trap: trapField,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setFormStatus({ loading: false, success: true, error: null });
        setTrapField('');
      } else {
        setFormStatus({
          loading: false,
          success: false,
          error: data?.error || 'Something went wrong. Please try again.',
        });
      }
    } catch {
      setFormStatus({
        loading: false,
        success: false,
        error: 'Network error. Please check your connection and try again.',
      });
    }
  };

  if (formStatus.success) {
    return (
      <>
        <SEO pageKey="podcast-guest-intake" />
        <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
          <section className="border-b border-[#1A1A1A]/08 bg-white px-6 py-20 lg:px-10">
            <div className="mx-auto max-w-[1400px]">
              <h1 className="mb-5 max-w-[640px] font-serif text-[clamp(28px,3.5vw,48px)] font-normal leading-[1.15] text-[#1A1A1A]">
                Thanks — we received your guest intake.
              </h1>
              <p className="max-w-[560px] font-sans text-[16px] leading-[1.8] text-[#6B6B6B]">
                Bart has your information and will reference it before your conversation. You will also get a
                copy of your answers by email.
              </p>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO pageKey="podcast-guest-intake" />
      <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
        <section className="bg-[#2B2929] px-6 pb-20 pt-24 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
              The Archetype Original Podcast — Guest Intake
            </p>
            <h1 className="mb-6 max-w-[680px] font-serif text-[clamp(36px,4.5vw,60px)] font-normal leading-[1.1] tracking-[-0.01em] text-white">
              Tell us who you are.
            </h1>
            <p className="max-w-[560px] font-sans text-[16px] leading-[1.8] text-white/65">
              No box to fit into, no title required. This helps us build your episode page and gives Bart a few
              threads to pull on before you sit down together. Takes about five minutes.
            </p>
          </div>
        </section>

        <div className="border-b-2 border-[#FAFAF9] bg-[#E1DED8] px-6 py-5 lg:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-8">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 shrink-0 bg-[#DB0812]" aria-hidden />
                <span className="font-sans text-[13px] text-[#6B6B6B]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="bg-[#FAFAF9] py-[72px]">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-12 px-6 lg:grid-cols-[1fr_340px] lg:gap-20 lg:px-10">
            <form onSubmit={handleSubmit} className="relative flex flex-col gap-[2px]">
              <div
                className="absolute -left-[10000px] h-px w-px overflow-hidden opacity-0"
                aria-hidden="true"
              >
                <label htmlFor="guest-form-trap">Leave this field blank</label>
                <input
                  id="guest-form-trap"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trapField}
                  onChange={(e) => setTrapField(e.target.value)}
                />
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <h3 className="mb-6 font-serif text-[18px] font-normal text-[#1A1A1A]">About you</h3>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Name <span className="text-[#DB0812]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleField('name', e.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Email <span className="text-[#DB0812]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleField('email', e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleField('phone', e.target.value)}
                      placeholder="(555) 555-5555"
                      className={inputClass}
                    />
                    {formData.phone.trim() && (
                      <label className="mt-3 flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.textOk}
                          onChange={(e) => handleField('textOk', e.target.checked)}
                          className="mt-0.5 h-4 w-4 border-[#1A1A1A]/20 text-[#DB0812] focus:ring-0"
                        />
                        <span className="font-sans text-[13px] leading-[1.5] text-[#6B6B6B]">
                          It&apos;s okay to text me about this episode
                        </span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleField('website', e.target.value)}
                      placeholder="https://"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Company or organization
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleField('company', e.target.value)}
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Headshot or logo
                    </label>
                    <p className="mb-3 font-sans text-[13px] leading-[1.6] text-[#6B6B6B]">
                      A photo of you or your company logo. Used on your episode page. JPG or PNG, up to 10MB.
                    </p>
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        handleImageSelect(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition-colors ${
                        dragActive
                          ? 'border-[#DB0812] bg-white'
                          : 'border-[#1A1A1A]/20 bg-[#FAFAF9] hover:border-[#DB0812] hover:bg-white'
                      }`}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt={imageFile?.name || 'Uploaded headshot preview'}
                          className="h-24 w-24 object-cover"
                        />
                      ) : (
                        <svg
                          className="h-6 w-6 text-[#A8A9AD]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                          />
                        </svg>
                      )}
                      <span className="font-sans text-[13px] font-medium text-[#1A1A1A]">
                        {imageUploadStatus === 'uploading'
                          ? 'Uploading...'
                          : 'Click to upload, or drag and drop'}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          handleImageSelect(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <h3 className="mb-2 font-serif text-[18px] font-normal text-[#1A1A1A]">Where to find you</h3>
                <p className="mb-5 font-sans text-[13px] leading-[1.65] text-[#6B6B6B]">
                  Add as many as you&apos;d like. We&apos;ll link these from your episode page.
                </p>
                <div className="space-y-5">
                  {SOCIAL_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={formData[field.key]}
                        onChange={(e) => handleField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <h3 className="mb-2 font-serif text-[18px] font-normal text-[#1A1A1A]">A brief bio</h3>
                <p className="mb-5 font-sans text-[13px] leading-[1.65] text-[#6B6B6B]">
                  Markdown is fine. Up to 5,000 characters. This appears on your episode page.
                </p>
                <textarea
                  rows={6}
                  value={formData.bio_md}
                  onChange={(e) => handleField('bio_md', e.target.value.slice(0, BIO_MAX))}
                  placeholder="Who are you, in your own words?"
                  className={textareaClass}
                />
                <p className="mt-2 text-right font-sans text-[12px] text-[#A8A9AD]">
                  {formData.bio_md.length} / {BIO_MAX}
                </p>
              </div>

              {GUEST_QUESTIONS.map((q) => (
                <div key={q.key} className="border border-[#1A1A1A]/08 bg-white p-8">
                  <span className="mb-2.5 block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DB0812]">
                    {q.number}
                  </span>
                  <span className="mb-5 block font-sans text-[16px] font-medium leading-[1.5] text-[#1A1A1A]">
                    {q.text}
                  </span>
                  <textarea
                    rows={4}
                    value={formData[q.key]}
                    onChange={(e) => handleField(q.key, e.target.value)}
                    placeholder={q.placeholder}
                    className={textareaClass}
                  />
                </div>
              ))}

              <div className="border border-[#1A1A1A]/08 bg-[#E1DED8] p-8">
                <h3 className="mb-4 font-serif text-[18px] font-normal text-[#1A1A1A]">Release</h3>
                <div className="mb-5 border-l-2 border-[#DB0812] bg-white py-4 pl-4 pr-4">
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    By submitting this form, you confirm you are 18 years of age or older (or have legal capacity
                    to enter this agreement).
                  </p>
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    You grant Archetype Original and Bart Paden permission to record, edit, publish, and distribute
                    your conversation in audio and video formats, including clips and excerpts, across Spotify, Apple
                    Podcasts, YouTube, archetypeoriginal.com, and AO&apos;s social media channels.
                  </p>
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    Your bio, photo, links, and submitted answers may be used on your episode page and in related
                    promotional materials as you provide them.
                  </p>
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    Your email and phone number are for coordination only. They will never be published or shared.
                  </p>
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    The transcript and content of this conversation may be used to train and expand the Archetype
                    Original knowledge corpus, an AI-powered system built on the body of work produced by Archetype
                    Original.
                  </p>
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    You confirm that what you share is your own to share, and that you&apos;re not bound by any
                    agreement that would prevent you from discussing it.
                  </p>
                  <p className="mb-3 font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    You retain the right to share and promote your appearance. Recording does not guarantee
                    publication, and Archetype Original retains editorial discretion over what&apos;s published and
                    how it&apos;s edited.
                  </p>
                  <p className="font-sans text-[13px] leading-[1.8] text-[#1A1A1A]">
                    This is provided without compensation. This release has no expiration date and covers current
                    and future use of the recorded content.
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.release_agreed}
                    onChange={(e) => handleField('release_agreed', e.target.checked)}
                    className="mt-0.5 h-4 w-4 border-[#1A1A1A]/20 text-[#DB0812] focus:ring-0"
                  />
                  <span className="font-sans text-[14px] leading-[1.5] text-[#1A1A1A]">
                    I have read and agree to the release above. <span className="text-[#DB0812]">*</span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-4 border border-[#1A1A1A]/08 bg-white p-8">
                {formStatus.error && (
                  <p className="font-sans text-[14px] text-[#DB0812]" role="alert">
                    {formStatus.error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={formStatus.loading}
                  className="inline-flex min-h-[44px] items-center justify-center self-start bg-[#DB0812] px-12 py-3.5 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {formStatus.loading ? 'Submitting...' : 'Submit'}
                </button>
                <p className="font-sans text-[13px] leading-[1.65] text-[#6B6B6B]">
                  You&apos;ll get a copy of your answers by email, and Bart will reference this before your
                  conversation.
                </p>
              </div>
            </form>

            <div className="flex flex-col gap-[2px] lg:sticky lg:top-[24px]">
              <div className="border border-[#1A1A1A]/08 bg-white p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  What this is for
                </p>
                <p className="mb-3 font-sans text-[13px] leading-[1.75] text-[#6B6B6B]">
                  This information builds your episode page: your bio, links, and a short reference Bart can pull
                  up before and during your conversation.
                </p>
                <p className="font-sans text-[13px] leading-[1.75] text-[#6B6B6B]">
                  Nothing here is a script. Bart just likes to know who he&apos;s talking to.
                </p>
              </div>

              <div className="border border-[#1A1A1A]/08 bg-white p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  No boxes
                </p>
                <div className="mb-4 border-l-2 border-[#DB0812] pl-4">
                  <p className="font-serif text-[15px] italic leading-[1.6] text-[#1A1A1A]">
                    We don&apos;t book guests because of their title, and your story doesn&apos;t need to connect
                    to business at all.
                  </p>
                </div>
                <p className="font-sans text-[13px] leading-[1.75] text-[#6B6B6B]">
                  Answer what&apos;s true for you. Short or long, both are good.
                </p>
              </div>

              <div className="bg-[#2B2929] p-7">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Questions?
                </p>
                <p className="font-sans text-[13px] leading-[1.75] text-white/55">
                  Reach out any time before the episode airs. Nothing here is final until your episode page goes
                  live.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
