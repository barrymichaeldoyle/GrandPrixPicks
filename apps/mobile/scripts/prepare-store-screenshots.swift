// App Store screenshots must be opaque. Re-encode simulator PNGs as RGB PNGs
// without resizing, cropping, or changing the captured interface.
// Usage: swift scripts/prepare-store-screenshots.swift store-screenshots/iphone-medium/*.png
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count > 1 else {
  fputs("Pass one or more simulator PNG paths.\n", stderr)
  exit(64)
}

for path in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: path)
  guard
    let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let original = CGImageSourceCreateImageAtIndex(source, 0, nil),
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
    let context = CGContext(
      data: nil,
      width: original.width,
      height: original.height,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    )
  else {
    fatalError("Cannot read screenshot: \(path)")
  }

  let bounds = CGRect(x: 0, y: 0, width: original.width, height: original.height)
  context.setFillColor(CGColor(gray: 0, alpha: 1))
  context.fill(bounds)
  context.draw(original, in: bounds)

  let output = NSMutableData()
  guard
    let image = context.makeImage(),
    let destination = CGImageDestinationCreateWithData(
      output, UTType.png.identifier as CFString, 1, nil
    )
  else {
    fatalError("Cannot prepare screenshot: \(path)")
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    fatalError("Cannot encode screenshot: \(path)")
  }
  try (output as Data).write(to: url, options: .atomic)
  print("Opaque PNG: \(url.lastPathComponent), \(image.width) × \(image.height)")
}
