/**
 * Ethics & Confidentiality Page
 * 
 * Purpose: Ethics and confidentiality information for Culture Science
 * Content: Placeholder text - Bart will fill in real content
 */
import React from 'react';
import SEO from '../../components/SEO';

export default function Ethics() {
  return (
    <>
      <SEO pageKey="ethics" />
      <div className="min-h-screen bg-warm-offWhite py-12 pt-28">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h1 className="h1 mb-8">Ethics & Confidentiality</h1>
            
            <section className="mb-12">
              <p className="p mb-6">
                Hero placeholder text here.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="h2 mb-6">Confidentiality</h2>
              <p className="p mb-6">
                Confidentiality placeholder text here.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="h2 mb-6">Aggregation</h2>
              <p className="p mb-6">
                Aggregation placeholder text here.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="h2 mb-6">&lt;5 Respondent Suppression</h2>
              <p className="p mb-6">
                Suppression placeholder text here.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

