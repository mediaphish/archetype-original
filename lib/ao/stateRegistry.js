/**
 * What Auto is allowed to look at.
 *
 * Bart: "The ideal is not to have unitaskers that only do certain things ... I
 * need my interaction to be with Auto. Not 2nd screens and buttons."
 *
 * Auto had nineteen tools, each shaped like exactly one workflow, and no way to
 * look at anything. Every fact it had arrived pre-chewed in a context block it
 * could not question. That is the actual difference between Auto and a capable
 * assistant — not the model, which is the same family. An assistant that cannot
 * read state can only ever run the plays someone wired for it in advance, and
 * every new phrasing of a request needs a new switch.
 *
 * This registry gives Auto eyes. One general capability instead of a tool per
 * question: name a resource, filter it, read it back.
 *
 * Safety comes from the registry, not from trusting the model:
 *   - only listed resources are reachable, so there is no table enumeration
 *   - only listed fields are selectable, so secrets cannot be read even if a
 *     column is added later
 *   - only listed fields are filterable, so no probing on hidden columns
 *   - every owner-scoped resource is forced to the caller's email server-side
 *   - no raw SQL crosses the boundary in either direction
 *
 * Adding a resource here is a deliberate act. That is the point: the surface is
 * a decision, not an accident.
 */

/**
 * @typedef {object} Resource
 * @property {string} table
 * @property {string[]} fields      Selectable, in the order they are returned.
 * @property {string[]} filters     Filterable field names.
 * @property {string} [ownerField]  Forced to the caller's email when present.
 * @property {string} order         Default sort column.
 * @property {boolean} [asc]
 * @property {number} max           Hard row cap.
 * @property {string} describe      What this resource is, for the model.
 */

/** @type {Record<string, Resource>} */
export const RESOURCES = {
  drafts: {
    table: 'ao_content_drafts',
    fields: [
      'id', 'slug', 'kind', 'title', 'status', 'series_slug', 'part_number',
      'image_url', 'summary', 'scheduled_publish_at', 'published_at',
      'approved_at', 'updated_at', 'created_at',
    ],
    filters: ['slug', 'kind', 'status', 'series_slug'],
    ownerField: 'created_by_email',
    order: 'updated_at',
    max: 50,
    describe:
      'Journal and content drafts. status is draft | approved | published | abandoned. ' +
      'A post being live in the corpus is the real signal that it is done — see get_publish_state.',
  },

  scheduled_posts: {
    table: 'ao_scheduled_posts',
    fields: [
      'id', 'channels', 'platform', 'caption', 'image_url', 'scheduled_at',
      'status', 'error_message', 'posted_at', 'source_kind', 'ao_lane', 'topic_tags',
    ],
    filters: ['status', 'platform', 'source_kind', 'ao_lane'],
    order: 'scheduled_at',
    max: 100,
    describe:
      'Social posts queued or already sent. status is scheduled | posted | failed. ' +
      'Use this to answer what is going out on a given day and what has failed.',
  },

  podcast_guests: {
    table: 'ao_podcast_guests',
    // Deliberately excludes magic_link_token and magic_link_expires_at: those
    // authenticate a guest and must never reach a model context.
    fields: [
      'id', 'name', 'company', 'website', 'image_url', 'bio_md', 'social_links',
      'question_1', 'question_2', 'question_3', 'question_4', 'question_5',
      'research_brief', 'suggested_questions', 'producer_brief',
      'schedule_preferred_days', 'schedule_preferred_time', 'schedule_timezone',
      'release_agreed', 'submitted_at', 'updated_at',
    ],
    filters: ['name', 'company'],
    order: 'submitted_at',
    max: 50,
    describe:
      'Podcast guests who have completed intake, including their brief and questions. ' +
      'Resolve a name Bart says to a guest row here before doing anything episode-related.',
  },

  episodes: {
    table: 'ao_episode_drafts',
    fields: [
      'id', 'slug', 'title', 'status', 'episode_type', 'summary', 'show_notes',
      'key_takeaways', 'guest', 'guest_id', 'guest_ids', 'recorded_date',
      'youtube_id', 'spotify_embed_url', 'duration', 'target_path', 'updated_at',
    ],
    filters: ['slug', 'status', 'episode_type', 'guest_id'],
    ownerField: 'created_by_email',
    order: 'updated_at',
    max: 50,
    describe:
      'Podcast episode drafts. NOTE: guests are represented four different ways on this ' +
      'table — guest, guest_id, guests, guest_ids — because the schema grew three times ' +
      'without consolidating. Read all of them before concluding who is on an episode.',
  },

  quote_queue: {
    table: 'ao_quote_review_queue',
    fields: ['id', 'quote_text', 'source_name', 'source_title', 'source_url', 'status', 'created_at'],
    filters: ['status'],
    order: 'created_at',
    max: 50,
    describe: 'Candidate quotes found by the scanner, awaiting review.',
  },

  brand_assets: {
    table: 'ao_brand_assets',
    fields: ['id', 'kind', 'label', 'variant', 'public_url', 'is_default_light', 'is_default_dark'],
    filters: ['kind', 'variant'],
    order: 'created_at',
    max: 50,
    describe: 'Logos and brand files. Use the stored asset rather than approximating a logo.',
  },
};

export function listResources() {
  return Object.entries(RESOURCES).map(([name, r]) => ({
    name,
    describe: r.describe,
    fields: r.fields,
    filters: r.filters,
  }));
}

/**
 * Validate a query against the registry.
 *
 * Returns {ok:false,error} rather than throwing, because the model reads the
 * error and retries — a thrown stack trace teaches it nothing.
 */
export function validateQuery({ resource, filters = {}, fields, limit }) {
  const def = RESOURCES[String(resource || '')];
  if (!def) {
    return {
      ok: false,
      error: `Unknown resource "${resource}". Available: ${Object.keys(RESOURCES).join(', ')}.`,
    };
  }

  const badFilter = Object.keys(filters || {}).find((k) => !def.filters.includes(k));
  if (badFilter) {
    return {
      ok: false,
      error: `Cannot filter ${resource} on "${badFilter}". Filterable: ${def.filters.join(', ')}.`,
    };
  }

  const requested = Array.isArray(fields) && fields.length ? fields : def.fields;
  const badField = requested.find((f) => !def.fields.includes(f));
  if (badField) {
    return {
      ok: false,
      error: `Cannot read "${badField}" on ${resource}. Readable: ${def.fields.join(', ')}.`,
    };
  }

  const n = Number(limit);
  const capped = Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), def.max) : Math.min(20, def.max);

  return { ok: true, def, fields: requested, limit: capped };
}
