// Cut the subject out of photos with Apple Vision, locally (macOS 14+). Nothing leaves the machine.
//
//   swift tools/mask.swift <photo.jpg | folder> [--out <dir>] [--person]
//
//   swift tools/mask.swift demo/photos                 → demo/cut/<name>.png for every jpg/png/heic in the folder
//   swift tools/mask.swift demo/photos/a.jpg --person  → demo/cut/a.png
//
// Output: an RGBA PNG the same size and orientation as the photo (EXIF orientation applied, as browsers do), so
// it registers exactly over the photo in Remotion. Default --out is a "cut" folder beside the photo's folder.
// Default request: VNGenerateForegroundInstanceMaskRequest (every foreground instance: person + what they hold).
// --person: union of VNGeneratePersonInstanceMaskRequest instances (people only; better for couples, drops props).
// Either falls back to VNGeneratePersonSegmentationRequest (.accurate) if it finds nothing.
// Clean-up: threshold the soft mask at 0.5, then blur 1 px. That avoids grey halos round hair; stray strands drop
// out, which is normal for stickers. Check every cutout at 100% before using it: busy rooms and loose hair can be
// ragged, and two people standing close merge into one shape.
import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Vision

var args = Array(CommandLine.arguments.dropFirst())
let wantPerson = args.contains("--person")
var outDir: String? = nil
if let i = args.firstIndex(of: "--out"), i + 1 < args.count { outDir = args[i + 1]; args.removeSubrange(i...(i + 1)) }
guard let input = args.first(where: { !$0.hasPrefix("--") }) else {
  print("usage: swift tools/mask.swift <photo | folder> [--out dir] [--person]"); exit(1)
}

let fm = FileManager.default
var isDir: ObjCBool = false
guard fm.fileExists(atPath: input, isDirectory: &isDir) else { print("not found: \(input)"); exit(1) }
let exts: Set<String> = ["jpg", "jpeg", "png", "heic"]
let files: [URL] = isDir.boolValue
  ? (try fm.contentsOfDirectory(atPath: input)).sorted().map { URL(fileURLWithPath: input).appendingPathComponent($0) }.filter { exts.contains($0.pathExtension.lowercased()) }
  : [URL(fileURLWithPath: input)]
if files.isEmpty { print("no photos in \(input)"); exit(1) }

let ctx = CIContext()

func cutOut(_ src: URL) -> Bool {
  let dirURL = outDir.map { URL(fileURLWithPath: $0) } ?? src.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("cut")
  try? fm.createDirectory(at: dirURL, withIntermediateDirectories: true)
  let dst = dirURL.appendingPathComponent(src.deletingPathExtension().lastPathComponent + ".png")
  // applyOrientationProperty: bake EXIF orientation in, so the mask matches what the browser shows
  guard let ci = CIImage(contentsOf: src, options: [.applyOrientationProperty: true]) else { print("cannot read \(src.path)"); return false }
  guard let cg = ctx.createCGImage(ci, from: ci.extent) else { print("cannot decode \(src.path)"); return false }
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  let full = CIImage(cgImage: cg)
  func scaled(_ buf: CVPixelBuffer) -> CIImage {
    let m = CIImage(cvPixelBuffer: buf)
    return m.transformed(by: CGAffineTransform(scaleX: full.extent.width / m.extent.width, y: full.extent.height / m.extent.height))
  }
  var mask: CIImage? = nil
  var used = ""
  do {
    if wantPerson {
      let r = VNGeneratePersonInstanceMaskRequest()
      try handler.perform([r])
      if let o = r.results?.first, !o.allInstances.isEmpty {
        mask = scaled(try o.generateScaledMaskForImage(forInstances: o.allInstances, from: handler)); used = "person-instance ×\(o.allInstances.count)"
      }
    } else {
      let r = VNGenerateForegroundInstanceMaskRequest()
      try handler.perform([r])
      if let o = r.results?.first, !o.allInstances.isEmpty {
        mask = scaled(try o.generateScaledMaskForImage(forInstances: o.allInstances, from: handler)); used = "foreground-instance ×\(o.allInstances.count)"
      }
    }
  } catch { print("vision: \(error)") }
  if mask == nil {
    let r = VNGeneratePersonSegmentationRequest()
    r.qualityLevel = .accurate
    r.outputPixelFormat = kCVPixelFormatType_OneComponent8
    try? handler.perform([r])
    if let b = r.results?.first?.pixelBuffer { mask = scaled(b); used = "person-segmentation" }
  }
  guard var m = mask else { print("\(src.lastPathComponent): no subject found"); return false }
  let th = CIFilter.colorThreshold(); th.inputImage = m; th.threshold = 0.5
  m = th.outputImage!.cropped(to: full.extent)
  let bl = CIFilter.gaussianBlur(); bl.inputImage = m.clampedToExtent(); bl.radius = 1
  m = bl.outputImage!.cropped(to: full.extent)
  let blend = CIFilter.blendWithMask()
  blend.inputImage = full
  blend.backgroundImage = CIImage(color: .clear).cropped(to: full.extent)
  blend.maskImage = m
  do {
    try ctx.writePNGRepresentation(of: blend.outputImage!.cropped(to: full.extent), to: dst, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  } catch { print("write failed: \(error)"); return false }
  print("\(src.lastPathComponent): \(used) → \(dst.path)")
  return true
}

var failed = 0
for f in files { if !cutOut(f) { failed += 1 } }
exit(failed == 0 ? 0 : 2)
