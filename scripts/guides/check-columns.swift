// Column check for guide PDFs (Bart, 2026-10-31: the right column is never longer
// than the left). Run after every build:
//   swift scripts/guides/check-columns.swift "<guide>.pdf"
// Pages marked FIX need a layout change before the guide goes to Bart.
import PDFKit
let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
for i in 0..<d.pageCount {
  let p = d.page(at: i)!
  guard let s = p.string, s.count > 200 else { continue }
  let w = p.bounds(for: .mediaBox).width
  var gutter = 0
  var lb = CGFloat(9999), rb = CGFloat(9999), lt = CGFloat(0), rt = CGFloat(0), ln = 0, rn = 0
  let ns = s as NSString
  for k in 0..<ns.length {
    let r = p.characterBounds(at: k)
    if r.width == 0 || r.minY < 70 { continue }  // skip footer
    if abs(r.midX - w/2) < 8 { gutter += 1 }
    if r.midX < w/2 { lb = min(lb, r.minY); lt = max(lt, r.maxY); ln += 1 } else { rb = min(rb, r.minY); rt = max(rt, r.maxY); rn += 1 }
  }
  if ln > 50 && rn > 50 && gutter < 3 {
    let diff = lb - rb  // positive: right column goes lower than left
    print(String(format: "page %d  right column longer by %.0f pt%@", i+1, diff, diff > 10 ? "   <-- FIX" : ""))
  }
}
