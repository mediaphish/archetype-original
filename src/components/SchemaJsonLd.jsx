import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Renders one or more JSON-LD objects as application/ld+json script tags.
 */
export default function SchemaJsonLd({ schema }) {
  const items = Array.isArray(schema) ? schema : [schema];

  return (
    <Helmet>
      {items.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
