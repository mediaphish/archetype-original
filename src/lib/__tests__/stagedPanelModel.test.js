/**
 * The staged panel's rules, tested without React.
 */
import { TABS, buildTabs, resolveOpenTab, pickImageCandidates } from '../stagedPanelModel.js';

describe('buildTabs', () => {
  it('marks approved stages done, the working stage current, the rest ahead', () => {
    const tabs = buildTabs({
      stage: 'image',
      tab: 'image',
      approvals: { brief: true, post: true, image: false, captions: false, schedule: false },
    });
    expect(tabs.map((t) => [t.key, t.state])).toEqual([
      ['research_brief', 'done'],
      ['post', 'done'],
      ['image', 'current'],
      ['captions', 'ahead'],
      ['schedule_publish', 'ahead'],
    ]);
  });

  it('marks everything done once published', () => {
    const tabs = buildTabs({ stage: 'published', tab: 'schedule_publish', approvals: {} });
    expect(tabs.every((t) => t.state === 'done')).toBe(true);
  });

  it('still returns all five tabs with no stage information', () => {
    expect(buildTabs(null)).toHaveLength(TABS.length);
  });
});

describe('resolveOpenTab', () => {
  it('opens the stage tab on first load', () => {
    expect(resolveOpenTab({ stageTab: 'image' })).toBe('image');
  });

  it('keeps the tab Bart clicked when the stage has not moved', () => {
    // Approvals move the tab; looking does not. A refetch returning the same
    // Image stage must not pull him off the Post tab he opened to reread.
    expect(resolveOpenTab({ userTab: 'post', previousTab: 'image', stageTab: 'image' })).toBe('post');
  });

  it('follows the stage forward even if Bart had another tab open', () => {
    expect(resolveOpenTab({ userTab: 'post', previousTab: 'image', stageTab: 'captions' })).toBe('captions');
  });

  it('does not follow the stage backwards', () => {
    // A reopen moves the stage back; the panel must not jump on its own.
    expect(resolveOpenTab({ userTab: 'image', previousTab: 'captions', stageTab: 'post' })).toBe('image');
  });

  it('ignores an unknown tab and falls back sensibly', () => {
    expect(resolveOpenTab({ userTab: 'nonsense', stageTab: null })).toBe('post');
  });
});

describe('pickImageCandidates', () => {
  const upload = { url: 'reference.jpg', addedAt: 5, manualUpload: true };
  const first = { url: 'first.png', addedAt: 10 };
  const second = { url: 'second.png', addedAt: 20 };

  it('shows only the newest candidate as current', () => {
    const out = pickImageCandidates([first, second]);
    expect(out.current.url).toBe('second.png');
    expect(out.previous.map((p) => p.url)).toEqual(['first.png']);
    expect(out.total).toBe(2);
  });

  it('never treats an upload as a candidate', () => {
    // The Cain regression: a rejected reference photo sat on top of the image
    // Bart had just asked for.
    const out = pickImageCandidates([upload, first]);
    expect(out.current.url).toBe('first.png');
    expect(out.uploads.map((u) => u.url)).toEqual(['reference.jpg']);
    expect(out.previous).toEqual([]);
  });

  it('uses the image saved on the draft when chat no longer has it', () => {
    const out = pickImageCandidates([], 'saved.png');
    expect(out.current).toMatchObject({ url: 'saved.png', savedOnDraft: true });
  });

  it('does not duplicate the saved image when chat already has it', () => {
    const out = pickImageCandidates([first, second], 'second.png');
    expect(out.total).toBe(2);
    expect(out.current.url).toBe('second.png');
  });

  it('does not promote an upload to candidate just because it was saved to the draft', () => {
    const out = pickImageCandidates([upload], 'reference.jpg');
    expect(out.current).toBeNull();
  });

  it('is empty with nothing to show', () => {
    expect(pickImageCandidates(null, null)).toEqual({ current: null, previous: [], uploads: [], total: 0 });
  });
});
