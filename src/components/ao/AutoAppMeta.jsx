import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Makes Auto installable on Bart's home screen.
 *
 * 2026-09-29. On his phone, Safari's own address bar and toolbar were eating
 * roughly 130 pixels, on top of the 268 the app itself took. He was left with
 * about 55% of the screen for the thing that matters, which is writing. Opening
 * from a home screen icon removes Safari's bars entirely and costs nothing: no
 * App Store, no review, no second codebase.
 *
 * Rendered only inside the AO admin, and the manifest is scoped to /ao/, so a
 * visitor who installs the public site does not land on Bart's login screen.
 */
export default function AutoAppMeta() {
  return (
    <Helmet>
      <link rel="manifest" href="/auto.webmanifest" />
      <link rel="apple-touch-icon" href="/app-icons/auto-180.png" />
      {/* iOS still reads the apple-prefixed one; the plain name is the standard. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Auto" />
      <meta name="theme-color" content="#ffffff" />
    </Helmet>
  );
}
