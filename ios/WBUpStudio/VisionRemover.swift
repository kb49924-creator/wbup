//
//  VisionRemover.swift
//  WBUpStudio
//
//  Created for WB Up Studio iOS Native Application.
//  Copyright © 2026 WB Up Studio. All rights reserved.
//

import UIKit
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO

/// Errors that can occur during Apple Vision background removal.
public enum VisionRemoverError: LocalizedError {
    case invalidImageData
    case failedToCreateCGImage
    case noForegroundDetected
    case unsupportedIOSVersion
    case processingFailed(String)

    public var errorDescription: String? {
        switch self {
        case .invalidImageData:
            return "Не удалось декодировать данные изображения (Invalid image data)."
        case .failedToCreateCGImage:
            return "Не удалось получить CGImage из исходного снимка (Failed to create CGImage)."
        case .noForegroundDetected:
            return "Объект на фото не обнаружен нейросетью (No foreground object detected)."
        case .unsupportedIOSVersion:
            return "Аппаратное вырезание объектов требует iOS 17.0+ (Requires iOS 17.0+)."
        case .processingFailed(let message):
            return "Ошибка обработки Vision: \(message)"
        }
    }
}

/// Hardware-accelerated background removal module powered by Apple Vision & Neural Engine (ANE).
public final class VisionRemover: @unchecked Sendable {

    public static let shared = VisionRemover()

    /// Shared CIContext utilizing GPU / Apple Neural Engine acceleration (software renderer disabled).
    private let ciContext: CIContext

    private init() {
        self.ciContext = CIContext(options: [
            .useSoftwareRenderer: false,
            .priorityRequestLow: false
        ])
    }

    // MARK: - Async / Await Public API

    /// Removes background from a base64 encoded image string (supports data URI scheme).
    /// Returns a base64 data URI PNG string with an alpha channel.
    public func removeBackground(from base64Input: String) async throws -> String {
        guard let imageData = extractData(from: base64Input),
              let originalImage = UIImage(data: imageData) else {
            throw VisionRemoverError.invalidImageData
        }

        let processedImage = try await removeBackground(from: originalImage)

        guard let pngData = processedImage.pngData() else {
            throw VisionRemoverError.processingFailed("Failed to encode output PNG.")
        }

        let base64Output = pngData.base64EncodedString()
        return "data:image/png;base64,\(base64Output)"
    }

    /// Removes background from a UIImage using Apple Vision Framework on Neural Engine/GPU.
    public func removeBackground(from image: UIImage) async throws -> UIImage {
        guard let cgImage = image.cgImage else {
            throw VisionRemoverError.failedToCreateCGImage
        }

        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                guard let self = self else {
                    continuation.resume(throwing: VisionRemoverError.processingFailed("VisionRemover deallocated."))
                    return
                }

                do {
                    let resultImage = try self.processWithVision(cgImage: cgImage, orientation: image.imageOrientation)
                    continuation.resume(returning: resultImage)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    // MARK: - Completion Handler Public API (Bridge Compatibility)

    /// Completion-handler based method for JavaScript bridge invocations.
    public func removeBackground(
        from base64Input: String,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        Task {
            do {
                let resultBase64 = try await self.removeBackground(from: base64Input)
                completion(.success(resultBase64))
            } catch {
                completion(.failure(error))
            }
        }
    }

    // MARK: - Core Vision Processing Pipeline

    private func processWithVision(cgImage: CGImage, orientation: UIImage.Orientation) throws -> UIImage {
        if #available(iOS 17.0, *) {
            return try processForegroundInstanceMask(cgImage: cgImage, orientation: orientation)
        } else {
            return try processLegacyPersonSegmentation(cgImage: cgImage, orientation: orientation)
        }
    }

    /// iOS 17+ Modern Hardware-Accelerated Foreground Segmentation (VNGenerateForegroundInstanceMaskRequest)
    @available(iOS 17.0, *)
    private func processForegroundInstanceMask(cgImage: CGImage, orientation: UIImage.Orientation) throws -> UIImage {
        let request = VNGenerateForegroundInstanceMaskRequest()
        let cgOrientation = cgImagePropertyOrientation(from: orientation)
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: cgOrientation, options: [:])

        try handler.perform([request])

        guard let observation = request.results?.first else {
            throw VisionRemoverError.noForegroundDetected
        }

        // Method 1: Generate masked image pixel buffer directly from observation
        do {
            let maskedPixelBuffer = try observation.generateMaskedImage(
                ofInstances: observation.allInstances,
                from: handler,
                croppedToInstancesExtent: false
            )

            let ciImage = CIImage(cvPixelBuffer: maskedPixelBuffer)
            guard let outputCGImage = ciContext.createCGImage(ciImage, from: ciImage.extent) else {
                throw VisionRemoverError.processingFailed("Could not render masked pixel buffer to CGImage.")
            }

            return UIImage(cgImage: outputCGImage, scale: 1.0, orientation: orientation)
        } catch {
            // Method 2 (Fallback): Generate scaled mask and blend with CIBlendWithMask
            return try blendWithScaledMask(observation: observation, handler: handler, cgImage: cgImage, orientation: orientation)
        }
    }

    /// High-precision CoreImage mask blending fallback
    @available(iOS 17.0, *)
    private func blendWithScaledMask(
        observation: VNInstanceMaskObservation,
        handler: VNImageRequestHandler,
        cgImage: CGImage,
        orientation: UIImage.Orientation
    ) throws -> UIImage {
        let maskPixelBuffer = try observation.generateScaledMaskForImage(
            forInstances: observation.allInstances,
            from: handler
        )

        let maskCI = CIImage(cvPixelBuffer: maskPixelBuffer)
        let inputCI = CIImage(cgImage: cgImage)

        let filter = CIFilter.blendWithMask()
        filter.inputImage = inputCI
        filter.maskImage = maskCI
        filter.backgroundImage = CIImage.empty()

        guard let outputCI = filter.outputImage,
              let outputCGImage = ciContext.createCGImage(outputCI, from: inputCI.extent) else {
            throw VisionRemoverError.processingFailed("CIFilter mask blending failed.")
        }

        return UIImage(cgImage: outputCGImage, scale: 1.0, orientation: orientation)
    }

    /// iOS 16 Fallback using VNGeneratePersonSegmentationRequest
    private func processLegacyPersonSegmentation(cgImage: CGImage, orientation: UIImage.Orientation) throws -> UIImage {
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .accurate
        let cgOrientation = cgImagePropertyOrientation(from: orientation)
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: cgOrientation, options: [:])

        try handler.perform([request])

        guard let observation = request.results?.first else {
            throw VisionRemoverError.noForegroundDetected
        }

        let maskPixelBuffer = observation.pixelBuffer
        let maskCI = CIImage(cvPixelBuffer: maskPixelBuffer)
        let inputCI = CIImage(cgImage: cgImage)

        // Scale mask to match input image dimensions
        let scaleX = inputCI.extent.width / maskCI.extent.width
        let scaleY = inputCI.extent.height / maskCI.extent.height
        let scaledMask = maskCI.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))

        let filter = CIFilter.blendWithMask()
        filter.inputImage = inputCI
        filter.maskImage = scaledMask
        filter.backgroundImage = CIImage.empty()

        guard let outputCI = filter.outputImage,
              let outputCG = ciContext.createCGImage(outputCI, from: inputCI.extent) else {
            throw VisionRemoverError.processingFailed("Legacy segmentation blending failed.")
        }

        return UIImage(cgImage: outputCG, scale: 1.0, orientation: orientation)
    }

    // MARK: - Helper Methods

    private func extractData(from base64String: String) -> Data? {
        let cleanString: String
        if let commaIndex = base64String.firstIndex(of: ",") {
            cleanString = String(base64String[base64String.index(after: commaIndex)...])
        } else {
            cleanString = base64String
        }

        let trimmed = cleanString.trimmingCharacters(in: .whitespacesAndNewlines)
        return Data(base64Encoded: trimmed, options: .ignoreUnknownCharacters)
    }

    private func cgImagePropertyOrientation(from orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
        switch orientation {
        case .up: return .up
        case .upMirrored: return .upMirrored
        case .down: return .down
        case .downMirrored: return .downMirrored
        case .left: return .left
        case .leftMirrored: return .leftMirrored
        case .right: return .right
        case .rightMirrored: return .rightMirrored
        @unknown default: return .up
        }
    }
}
