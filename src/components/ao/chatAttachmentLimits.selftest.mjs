/**
 * Chat attachment packing / size guard (#135).
 * Canvas resize is browser-only; this covers packing, scale, and wiring.
 *
 * Run: node src/components/ao/chatAttachmentLimits.selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MAX_ATTACHMENT_DIMENSION,
  MAX_TOTAL_ATTACHMENT_BYTES,
  attachmentOverLimitMessage,
  attachmentScale,
  packAttachmentsUnderLimit,
  totalAttachmentBytes,
} from './chatAttachmentLimits.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const fake = (name, bytes) => ({ name, dataUrl: 'x'.repeat(bytes) });

assert(MAX_ATTACHMENT_DIMENSION === 1280, 'longest side is 1280');
assert(MAX_TOTAL_ATTACHMENT_BYTES === 3_200_000, 'combined cap is 3.2MB');

assert(attachmentScale(200, 200) === 1, 'small images are not upscaled');
assert(attachmentScale(640, 480) === 1, 'already-under-max images stay at scale 1');
assert(attachmentScale(2560, 1920) === 0.5, '2560 longest side scales to 1280');
assert(attachmentScale(1280, 720) === 1, 'exactly-max longest side is not upscaled');

const under = fake('a.jpg', 1_000_000);
const mid = fake('b.jpg', 1_000_000);
const over = fake('c.jpg', 1_500_000);
const packed = packAttachmentsUnderLimit([under], [mid, over]);
assert(packed.kept.length === 2, 'keeps as many new files as fit in selection order');
assert(packed.kept[0].name === 'a.jpg' && packed.kept[1].name === 'b.jpg', 'first-fit order');
assert(packed.dropped.length === 1 && packed.dropped[0].name === 'c.jpg', 'drops only what does not fit');
assert(totalAttachmentBytes(packed.kept) <= MAX_TOTAL_ATTACHMENT_BYTES, 'kept batch stays under cap');

const noneFit = packAttachmentsUnderLimit([fake('big.jpg', 3_100_000)], [fake('extra.jpg', 200_000)]);
assert(noneFit.kept.length === 1 && noneFit.dropped.length === 1, 'does not evict already-pending files');

const pdf = fake('notes.pdf', 50_000);
const img = fake('shot.jpg', 100_000);
const mixed = packAttachmentsUnderLimit([], [pdf, img]);
assert(mixed.kept.length === 2, 'non-image files count toward the combined guard and still attach');
assert(totalAttachmentBytes(mixed.kept) === 150_000, 'pdf + image bytes are summed');

const msg = attachmentOverLimitMessage();
assert(/too large to send in one message/.test(msg), 'error explains the combined-size problem');
assert(/3MB/.test(msg), 'error names the approximate limit');
assert(/fewer images|separate messages/.test(msg), 'error tells the user what to do');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const panel = fs.readFileSync(path.join(ROOT, 'src/components/ao/AutoV2Panel.jsx'), 'utf8');

assert(/resizeImageFileToDataUrl/.test(panel), 'handleFileSelect uses resize helper');
assert(/packAttachmentsUnderLimit/.test(panel), 'handleFileSelect packs under the combined cap');
assert(/totalAttachmentBytes\(fileSnaps\)/.test(panel), 'sendMessage re-checks combined size before POST');

const headerFn = panel.indexOf('const handleHeaderImageUpload');
assert(headerFn > 0, 'handleHeaderImageUpload still exists');
const headerEnd = panel.indexOf('[messages, activeThreadId]', headerFn);
assert(headerEnd > headerFn, 'handleHeaderImageUpload dependency list still present');
const headerBlock = panel.slice(headerFn, headerEnd);
assert(/reader.readAsDataURL\(file\)/.test(headerBlock), 'header-image upload still reads the original file');
assert(!/resizeImageFileToDataUrl/.test(headerBlock), 'header-image upload is not resized by the chat attach path');

console.log('chatAttachmentLimits.selftest.mjs: ok');
