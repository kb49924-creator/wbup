//
//  ViewController.swift
//  WBUpStudio
//
//  Created for WB Up Studio iOS Native Application.
//  Copyright © 2026 WB Up Studio. All rights reserved.
//

import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {

    // MARK: - Properties

    private var webView: WKWebView!
    private var visualEffectView: UIVisualEffectView!
    private var gradientLayer: CAGradientLayer?
    private var displayLink: CADisplayLink?

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    override var prefersStatusBarHidden: Bool {
        return false
    }

    override var prefersHomeIndicatorAutoHidden: Bool {
        return false
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        setupBlurBackground()
        setupWebView()
        setupProMotionOptimization()
        loadWebContent()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        gradientLayer?.frame = view.bounds
        visualEffectView.frame = view.bounds
        webView.frame = view.bounds
    }

    deinit {
        displayLink?.invalidate()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "haptic")
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "removeBackground")
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "nativeLog")
    }

    // MARK: - UI & Background Setup

    private func setupBlurBackground() {
        // Dark frosted glass aurora background (macOS / iOS liquid glass look)
        let blurEffect = UIBlurEffect(style: .systemUltraThinMaterialDark)
        visualEffectView = UIVisualEffectView(effect: blurEffect)
        visualEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(visualEffectView)

        let gradientLayer = CAGradientLayer()
        gradientLayer.colors = [
            UIColor(red: 0.05, green: 0.05, blue: 0.08, alpha: 1.0).cgColor,
            UIColor(red: 0.10, green: 0.05, blue: 0.15, alpha: 1.0).cgColor,
            UIColor(red: 0.02, green: 0.02, blue: 0.04, alpha: 1.0).cgColor
        ]
        gradientLayer.locations = [0.0, 0.5, 1.0]
        gradientLayer.frame = view.bounds
        self.gradientLayer = gradientLayer
        view.layer.insertSublayer(gradientLayer, at: 0)
    }

    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        if #available(iOS 15.4, *) {
            configuration.preferences.isElementFullscreenEnabled = true
        }

        let userContentController = WKUserContentController()

        // 1. Inject meta viewport to disable pinch-zoom and fit notch/home indicator
        let viewportScript = """
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        var head = document.getElementsByTagName('head')[0];
        if (head) { head.appendChild(meta); }
        """
        let userScript = WKUserScript(
            source: viewportScript,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(userScript)

        // 2. Inject native JavaScript bridge (window.WBUpNative)
        let bridgeScript = """
        (function() {
            window.WBUpNative = {
                isNative: true,
                platform: 'iOS',
                hardwareAcceleration: 'Apple Neural Engine / CoreML',
                proMotionSupported: true,

                haptic: function(type) {
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptic) {
                        window.webkit.messageHandlers.haptic.postMessage(type || 'medium');
                    }
                },

                removeBackground: function(base64Image) {
                    return new Promise(function(resolve, reject) {
                        var requestId = 'wb_req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        window._wbRemoveBgCallbacks = window._wbRemoveBgCallbacks || {};
                        window._wbRemoveBgCallbacks[requestId] = { resolve: resolve, reject: reject };

                        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.removeBackground) {
                            window.webkit.messageHandlers.removeBackground.postMessage({
                                id: requestId,
                                image: base64Image
                            });
                        } else {
                            reject(new Error('WBUpStudio: Native removeBackground handler is unavailable.'));
                        }
                    });
                },

                _onBackgroundRemoved: function(requestId, success, resultData, errorMessage) {
                    if (window._wbRemoveBgCallbacks && window._wbRemoveBgCallbacks[requestId]) {
                        var cb = window._wbRemoveBgCallbacks[requestId];
                        if (success) {
                            cb.resolve(resultData);
                        } else {
                            cb.reject(new Error(errorMessage || 'Apple Vision segmentation failed'));
                        }
                        delete window._wbRemoveBgCallbacks[requestId];
                    }

                    var event = new CustomEvent('wbBackgroundRemoved', {
                        detail: {
                            id: requestId,
                            success: success,
                            image: resultData,
                            error: errorMessage
                        }
                    });
                    window.dispatchEvent(event);
                },

                log: function(msg) {
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeLog) {
                        window.webkit.messageHandlers.nativeLog.postMessage(msg);
                    }
                }
            };
        })();
        """
        let bridgeUserScript = WKUserScript(
            source: bridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userContentController.addUserScript(bridgeUserScript)

        // 3. Register message handlers using weak proxy to prevent retain cycles
        let weakProxy = WeakScriptMessageHandler(delegate: self)
        userContentController.add(weakProxy, name: "haptic")
        userContentController.add(weakProxy, name: "removeBackground")
        userContentController.add(weakProxy, name: "nativeLog")

        configuration.userContentController = userContentController

        // 4. Create transparent WKWebView with ProMotion scrolling
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        // Disable zoom gesture recognizer
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false

        // ProMotion 120Hz smooth scrolling
        webView.scrollView.decelerationRate = .normal
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        view.addSubview(webView)
    }

    /// ProMotion 120Hz optimization
    private func setupProMotionOptimization() {
        if #available(iOS 15.0, *) {
            displayLink = CADisplayLink(target: self, selector: #selector(displayLinkTick))
            displayLink?.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
            displayLink?.add(to: .main, forMode: .common)
        }
    }

    @objc private func displayLinkTick() {
        // Keeps render loop synced to 120Hz ProMotion display
    }

    // MARK: - Loading Assets

    private func loadWebContent() {
        // 1. Try bundled www/index.html
        if let bundledIndexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            let wwwDirectory = bundledIndexURL.deletingLastPathComponent()
            webView.loadFileURL(bundledIndexURL, allowingReadAccessTo: wwwDirectory)
            return
        }

        // 2. Try root index.html
        if let rootIndexURL = Bundle.main.url(forResource: "index", withExtension: "html") {
            let bundleDir = rootIndexURL.deletingLastPathComponent()
            webView.loadFileURL(rootIndexURL, allowingReadAccessTo: bundleDir)
            return
        }

        // 3. Try bundle path lookup
        let path = Bundle.main.bundlePath + "/www/index.html"
        if FileManager.default.fileExists(atPath: path) {
            let url = URL(fileURLWithPath: path)
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
            return
        }

        // 4. Dev server fallback or embedded fallback HTML
        if let devServerURL = URL(string: "http://127.0.0.1:8000") {
            var request = URLRequest(url: devServerURL, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 3.0)
            request.addValue("WBUpStudio-iOS", forHTTPHeaderField: "X-Client")

            URLSession.shared.dataTask(with: request) { [weak self] (_, response, error) in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    if error == nil, let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                        self.webView.load(request)
                    } else {
                        self.loadEmbeddedFallbackHTML()
                    }
                }
            }.resume()
        } else {
            loadEmbeddedFallbackHTML()
        }
    }

    private func loadEmbeddedFallbackHTML() {
        let fallbackHTML = """
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
            <title>WB Up Studio</title>
            <style>
                body {
                    margin: 0;
                    padding: 40px 24px;
                    background: #0d0e12;
                    color: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 80vh;
                    text-align: center;
                }
                .logo { font-size: 56px; margin-bottom: 12px; }
                h1 { font-size: 26px; font-weight: 700; margin: 0 0 8px; }
                p { color: #a1a1aa; font-size: 15px; max-width: 320px; line-height: 1.5; margin: 0 0 24px; }
                .card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    width: 100%;
                    max-width: 340px;
                    box-sizing: border-box;
                    margin-bottom: 20px;
                }
                .btn {
                    display: block;
                    width: 100%;
                    padding: 14px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    color: white;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="logo"></div>
            <h1>WB Up Studio</h1>
            <p>Профессиональная студия карточек товаров Wildberries для iOS</p>
            <div class="card">
                <div style="font-size: 14px; color: #d4d4d8; margin-bottom: 12px;">Проверка нативного моста Taptic Engine:</div>
                <button class="btn" onclick="window.WBUpNative.haptic('success')">Виброотклик Haptic</button>
            </div>
            <button class="btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);" onclick="location.reload()">Обновить</button>
        </body>
        </html>
        """
        webView.loadHTMLString(fallbackHTML, baseURL: nil)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "haptic":
            handleHapticMessage(message.body)

        case "removeBackground":
            handleRemoveBackgroundMessage(message.body)

        case "nativeLog":
            if let text = message.body as? String {
                print("[WBUpStudio-JS] \(text)")
            }

        default:
            print("[WBUpStudio] Unrecognized script message: \(message.name)")
        }
    }

    // MARK: - Message Handlers

    private func handleHapticMessage(_ body: Any) {
        let hapticType: String
        if let dict = body as? [String: Any], let type = dict["type"] as? String {
            hapticType = type
        } else if let typeString = body as? String {
            hapticType = typeString
        } else {
            hapticType = "medium"
        }

        HapticManager.shared.trigger(hapticType)
    }

    private func handleRemoveBackgroundMessage(_ body: Any) {
        var requestId = UUID().uuidString
        var base64ImageString: String?

        if let dict = body as? [String: Any] {
            if let id = dict["id"] as? String {
                requestId = id
            }
            if let image = dict["image"] as? String {
                base64ImageString = image
            }
        } else if let rawString = body as? String {
            base64ImageString = rawString
        }

        guard let inputImage = base64ImageString, !inputImage.isEmpty else {
            sendRemoveBackgroundResult(
                requestId: requestId,
                success: false,
                resultData: nil,
                errorMessage: "Empty or invalid image parameter."
            )
            return
        }

        // Trigger light haptic upon starting processing
        HapticManager.shared.trigger("light")

        // Perform hardware-accelerated background removal on Apple Neural Engine
        VisionRemover.shared.removeBackground(from: inputImage) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success(let outputBase64):
                    // Success haptic feedback
                    HapticManager.shared.trigger("success")
                    self.sendRemoveBackgroundResult(
                        requestId: requestId,
                        success: true,
                        resultData: outputBase64,
                        errorMessage: nil
                    )

                case .failure(let error):
                    // Error haptic feedback
                    HapticManager.shared.trigger("warning")
                    self.sendRemoveBackgroundResult(
                        requestId: requestId,
                        success: false,
                        resultData: nil,
                        errorMessage: error.localizedDescription
                    )
                }
            }
        }
    }

    private func sendRemoveBackgroundResult(
        requestId: String,
        success: Bool,
        resultData: String?,
        errorMessage: String?
    ) {
        let escapedId = requestId.replacingOccurrences(of: "'", with: "\\'")
        let successStr = success ? "true" : "false"

        let escapedData: String
        if let data = resultData {
            escapedData = "'\(data.replacingOccurrences(of: "'", with: "\\'"))'"
        } else {
            escapedData = "null"
        }

        let escapedError: String
        if let err = errorMessage {
            escapedError = "'\(err.replacingOccurrences(of: "'", with: "\\'"))'"
        } else {
            escapedError = "null"
        }

        let js = "window.WBUpNative && window.WBUpNative._onBackgroundRemoved('\(escapedId)', \(successStr), \(escapedData), \(escapedError));"

        webView.evaluateJavaScript(js) { _, error in
            if let error = error {
                print("[WBUpStudio] Error sending background removal result to JS: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let js = """
        window.IS_IOS_NATIVE_APP = true;
        if (window.app && window.app.state) {
            window.app.state.isStandalone = true;
        }
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
        print("[WBUpStudio] Web content loaded successfully.")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("[WBUpStudio] Navigation error: \(error.localizedDescription)")
    }
}

// MARK: - Weak Script Message Handler Proxy

private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
