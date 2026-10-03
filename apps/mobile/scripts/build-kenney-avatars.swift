import AppKit
import Foundation

// Generates the first bounded NearHere character catalog from CC0 Kenney source
// layers in ../assets/avatars/kenney-v1/source. This is an asset-build tool, not
// application runtime code. See ../assets/avatars/kenney-v1/README.md.

let scriptURL = URL(fileURLWithPath: #filePath)
let mobileRoot = scriptURL.deletingLastPathComponent().deletingLastPathComponent()
let avatarRoot = mobileRoot.appendingPathComponent("assets/avatars/kenney-v1", isDirectory: true)
let sourceRoot = avatarRoot.appendingPathComponent("source", isDirectory: true)
let outputRoot = avatarRoot.appendingPathComponent("compiled", isDirectory: true)
try FileManager.default.createDirectory(at: outputRoot, withIntermediateDirectories: true)

struct Look {
  let id: String
  let head: String
  let hair: String
  let shirt: String
  let arm: String
  let waist: String
  let leg: String
  let shoe: String
}

let looks: [Look] = [
  Look(id: "kenney-01", head: "skin/tint1-head.png", hair: "hair/black.png", shirt: "shirts/greenShirt1.png", arm: "shirts/greenArm_long.png", waist: "pants/navy-waist.png", leg: "pants/navy-leg.png", shoe: "shoes/brown.png"),
  Look(id: "kenney-02", head: "skin/tint3-head.png", hair: "hair/brown.png", shirt: "shirts/blueShirt1.png", arm: "shirts/blueArm_long.png", waist: "pants/tan-waist.png", leg: "pants/tan-leg.png", shoe: "shoes/grey.png"),
  Look(id: "kenney-03", head: "skin/tint5-head.png", hair: "hair/blonde.png", shirt: "shirts/pineShirt1.png", arm: "shirts/pineArm_long.png", waist: "pants/pine-waist.png", leg: "pants/pine-leg.png", shoe: "shoes/black.png"),
  Look(id: "kenney-04", head: "skin/tint8-head.png", hair: "hair/red.png", shirt: "shirts/redShirt1.png", arm: "shirts/redArm_long.png", waist: "pants/blue-waist.png", leg: "pants/blue-leg.png", shoe: "shoes/blue.png"),
  Look(id: "kenney-05", head: "skin/tint1-head.png", hair: "hair/brown.png", shirt: "shirts/blueShirt1.png", arm: "shirts/blueArm_long.png", waist: "pants/pine-waist.png", leg: "pants/pine-leg.png", shoe: "shoes/black.png"),
  Look(id: "kenney-06", head: "skin/tint3-head.png", hair: "hair/red.png", shirt: "shirts/pineShirt1.png", arm: "shirts/pineArm_long.png", waist: "pants/navy-waist.png", leg: "pants/navy-leg.png", shoe: "shoes/brown.png"),
  Look(id: "kenney-07", head: "skin/tint5-head.png", hair: "hair/black.png", shirt: "shirts/redShirt1.png", arm: "shirts/redArm_long.png", waist: "pants/tan-waist.png", leg: "pants/tan-leg.png", shoe: "shoes/grey.png"),
  Look(id: "kenney-08", head: "skin/tint8-head.png", hair: "hair/blonde.png", shirt: "shirts/greenShirt1.png", arm: "shirts/greenArm_long.png", waist: "pants/blue-waist.png", leg: "pants/blue-leg.png", shoe: "shoes/blue.png"),
]

let canvasSize = NSSize(width: 512, height: 768)

func image(_ relativePath: String) -> NSImage {
  let url = sourceRoot.appendingPathComponent(relativePath)
  guard let value = NSImage(contentsOf: url) else { fatalError("Missing source asset: \(url.path)") }
  return value
}

func draw(_ relativePath: String, in rect: NSRect, flipped: Bool = false) {
  let value = image(relativePath)
  guard flipped else {
    value.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
    return
  }
  NSGraphicsContext.saveGraphicsState()
  let transform = NSAffineTransform()
  transform.translateX(by: rect.maxX + rect.minX, yBy: 0)
  transform.scaleX(by: -1, yBy: 1)
  transform.concat()
  value.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
  NSGraphicsContext.restoreGraphicsState()
}

func render(_ look: Look) throws {
  let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize.width),
    pixelsHigh: Int(canvasSize.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
  NSGraphicsContext.current?.imageInterpolation = .high

  // The source sprites are trimmed. These coordinates establish NearHere's
  // canonical 512×768 canvas and a shared 40 pt feet baseline.
  draw(look.shoe, in: NSRect(x: 115, y: 40, width: 120, height: 54), flipped: true)
  draw(look.shoe, in: NSRect(x: 277, y: 40, width: 120, height: 54))
  draw(look.leg, in: NSRect(x: 135, y: 78, width: 141, height: 211), flipped: true)
  draw(look.leg, in: NSRect(x: 237, y: 78, width: 141, height: 211))
  draw(look.waist, in: NSRect(x: 141, y: 270, width: 230, height: 71))
  draw(look.arm, in: NSRect(x: 42, y: 307, width: 215, height: 178), flipped: true)
  draw(look.arm, in: NSRect(x: 255, y: 307, width: 215, height: 178))
  draw(look.shirt, in: NSRect(x: 141, y: 300, width: 230, height: 262))
  draw(look.head, in: NSRect(x: 126, y: 509, width: 260, height: 252))
  // All selected short-hair layers sit behind the head and above its crown.
  draw(look.hair, in: NSRect(x: 126, y: 620, width: 260, height: 198))
  draw("face/face1.png", in: NSRect(x: 206, y: 566, width: 100, height: 101))

  NSGraphicsContext.current?.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()
  let destination = outputRoot.appendingPathComponent("\(look.id).png")
  guard let png = bitmap.representation(using: .png, properties: [:]) else {
    throw CocoaError(.fileWriteUnknown)
  }
  try png.write(to: destination)
  print("Wrote \(destination.path)")
}

try looks.forEach(render)
