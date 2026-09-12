//
//  HapticManager.swift
//  WBUpStudio
//
//  Created for WB Up Studio iOS Native Application.
//  Copyright © 2026 WB Up Studio. All rights reserved.
//

import UIKit

/// High-performance Taptic Engine feedback manager for WB Up Studio.
public final class HapticManager {

    public static let shared = HapticManager()

    // Pre-warmed feedback generators for 0ms perceptible latency
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let softImpact = UIImpactFeedbackGenerator(style: .soft)
    private let rigidImpact = UIImpactFeedbackGenerator(style: .rigid)
    private let notificationFeedback = UINotificationFeedbackGenerator()
    private let selectionFeedback = UISelectionFeedbackGenerator()

    private init() {
        prepareAll()
    }

    /// Prepares generators to reduce tactile latency.
    public func prepareAll() {
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        softImpact.prepare()
        rigidImpact.prepare()
        notificationFeedback.prepare()
        selectionFeedback.prepare()
    }

    /// Triggers haptic feedback based on requested identifier.
    /// Supports: "light", "medium", "heavy", "soft", "rigid", "success", "warning", "error", "selection".
    @MainActor
    public func trigger(_ type: String) {
        switch type.lowercased() {
        case "light":
            lightImpact.prepare()
            lightImpact.impactOccurred()

        case "medium":
            mediumImpact.prepare()
            mediumImpact.impactOccurred()

        case "heavy":
            heavyImpact.prepare()
            heavyImpact.impactOccurred()

        case "soft":
            softImpact.prepare()
            softImpact.impactOccurred()

        case "rigid":
            rigidImpact.prepare()
            rigidImpact.impactOccurred()

        case "success":
            notificationFeedback.prepare()
            notificationFeedback.notificationOccurred(.success)

        case "warning":
            notificationFeedback.prepare()
            notificationFeedback.notificationOccurred(.warning)

        case "error":
            notificationFeedback.prepare()
            notificationFeedback.notificationOccurred(.error)

        case "selection":
            selectionFeedback.prepare()
            selectionFeedback.selectionChanged()

        default:
            // Default to medium impact for unrecognized strings
            mediumImpact.prepare()
            mediumImpact.impactOccurred()
        }
    }
}
