import AppKit
import Foundation

// Reproducible, non-shipping contact sheet made from the CC0 Kenney modular
// character source parts in this directory. Run from any working directory:
// swift render-preview.swift

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let assets = root.appendingPathComponent("assets", isDirectory: true)
let output = root.appendingPathComponent("kenney-profile-crops-prototype.png")
let width = 1360
let height = 520
let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: width,
  pixelsHigh: height,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current?.imageInterpolation = .high

func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
  NSColor(
    srgbRed: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: alpha
  )
}

func draw(_ name: String, in rect: NSRect) {
  let url = assets.appendingPathComponent(name)
  guard let image = NSImage(contentsOf: url) else {
    fatalError("Missing source sprite: \(url.path)")
  }
  image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
}

color(0x111516).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()

let options: [(head: String, hair: String, label: String)] = [
  ("head-tint-1.png", "hair-black.png", "Look 01"),
  ("head-tint-3.png", "hair-brown-2.png", "Look 02"),
  ("head-tint-5.png", "hair-blonde.png", "Look 03"),
  ("head-tint-8.png", "hair-red.png", "Look 04"),
]

for (index, option) in options.enumerated() {
  let x = CGFloat(24 + index * 336)
  let card = NSRect(x: x, y: 28, width: 312, height: 464)
  color(0x1c2223).setFill()
  NSBezierPath(roundedRect: card, xRadius: 28, yRadius: 28).fill()
  color(0x3b4643).setStroke()
  let border = NSBezierPath(roundedRect: card.insetBy(dx: 0.5, dy: 0.5), xRadius: 28, yRadius: 28)
  border.lineWidth = 1
  border.stroke()

  let cx = x + 28
  let circle = NSRect(x: cx, y: 164, width: 256, height: 256)
  color(0x26332e).setFill()
  NSBezierPath(ovalIn: circle).fill()
  color(0xd4f76a).setStroke()
  let ring = NSBezierPath(ovalIn: circle.insetBy(dx: 1, dy: 1))
  ring.lineWidth = 2
  ring.stroke()

  // Cropping frame deliberately focuses on the face, retaining hair and ears.
  // The pack's hair sprite belongs behind the tinted head; moving it slightly
  // up exposes the crown while the head masks the lower side-locks.
  draw(option.hair, in: NSRect(x: x + 70, y: 285, width: 171, height: 130))
  draw(option.head, in: NSRect(x: x + 70, y: 216, width: 173, height: 168))
  draw("face-1.png", in: NSRect(x: x + 106, y: 250, width: 100, height: 101))

  let title = NSString(string: option.label)
  title.draw(
    at: NSPoint(x: x + 28, y: 92),
    withAttributes: [
      .font: NSFont.systemFont(ofSize: 22, weight: .semibold),
      .foregroundColor: color(0xf4f5ef),
    ]
  )
  NSString(string: "CC0 sprite-layer crop · concept only").draw(
    at: NSPoint(x: x + 28, y: 62),
    withAttributes: [
      .font: NSFont.systemFont(ofSize: 12, weight: .regular),
      .foregroundColor: color(0xaeb9b5),
    ]
  )
}

NSGraphicsContext.current?.flushGraphics()
NSGraphicsContext.restoreGraphicsState()
let png = rep.representation(using: .png, properties: [:])!
try png.write(to: output)
print("Wrote \(output.path)")
