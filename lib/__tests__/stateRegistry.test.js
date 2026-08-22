/**
 * @jest-environment node
 *
 * The registry is the security boundary for Auto's new ability to read state.
 * Safety has to come from here, not from the model choosing well.
 */
import { RESOURCES, listResources, validateQuery } from '../ao/stateRegistry.js';

describe('validateQuery', () => {
  it('accepts a legitimate query and defaults the field list', () => {
    const out = validateQuery({ resource: 'drafts', filters: { status: 'approved' } });
    expect(out.ok).toBe(true);
    expect(out.fields).toEqual(RESOURCES.drafts.fields);
    expect(out.limit).toBe(20);
  });

  it('refuses an unlisted resource and names what is available', () => {
    // An error the model can act on beats a stack trace it cannot.
    const out = validateQuery({ resource: 'ao_x_tokens' });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/Unknown resource/);
    expect(out.error).toMatch(/drafts/);
  });

  it('refuses a field that is not on the readable list', () => {
    const out = validateQuery({ resource: 'drafts', fields: ['content'] });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/Cannot read "content"/);
  });

  it('refuses filtering on a field that is not filterable', () => {
    const out = validateQuery({ resource: 'drafts', filters: { created_by_email: 'x@y.com' } });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/Cannot filter/);
  });

  it('caps the row limit at the resource maximum', () => {
    expect(validateQuery({ resource: 'drafts', limit: 5000 }).limit).toBe(RESOURCES.drafts.max);
    expect(validateQuery({ resource: 'drafts', limit: -3 }).limit).toBe(20);
    expect(validateQuery({ resource: 'drafts', limit: 'many' }).limit).toBe(20);
  });
});

describe('resource definitions', () => {
  it('never exposes a guest magic link', () => {
    // These authenticate a guest. They must not reach a model context, and a
    // future column addition must not quietly become readable.
    const g = RESOURCES.podcast_guests.fields;
    expect(g).not.toContain('magic_link_token');
    expect(g).not.toContain('magic_link_expires_at');
  });

  it('never exposes contact details that were not asked for', () => {
    const g = RESOURCES.podcast_guests.fields;
    expect(g).not.toContain('email');
    expect(g).not.toContain('phone');
  });

  it('scopes owner-owned resources to the caller', () => {
    expect(RESOURCES.drafts.ownerField).toBe('created_by_email');
    expect(RESOURCES.episodes.ownerField).toBe('created_by_email');
  });

  it('describes every resource for the model', () => {
    for (const [name, r] of Object.entries(RESOURCES)) {
      expect(typeof r.describe).toBe('string');
      expect(r.describe.length).toBeGreaterThan(20);
      expect(r.fields.length).toBeGreaterThan(0);
      expect(r.max).toBeGreaterThan(0);
      expect(name).toMatch(/^[a-z_]+$/);
    }
  });

  it('only allows filtering on fields that are also readable', () => {
    for (const r of Object.values(RESOURCES)) {
      for (const f of r.filters) expect(r.fields).toContain(f);
    }
  });
});

describe('listResources', () => {
  it('returns a catalogue the model can read', () => {
    const list = listResources();
    expect(list.length).toBe(Object.keys(RESOURCES).length);
    expect(list.find((r) => r.name === 'podcast_guests')).toBeTruthy();
  });
});
