// ============================================================
// tracker.js — Camera + MediaPipe Hands finger tracking
// ============================================================

/**
 * Initializes the camera and MediaPipe Hands for finger tracking.
 * Provides getFingerPosition() which returns {x, y, active} for the
 * index fingertip in canvas-space coordinates, or null if no hand.
 *
 * Falls back to mouse if camera is unavailable.
 */
export class FingerTracker {
  constructor(videoEl, canvasEl) {
    this.video = videoEl;
    this.canvas = canvasEl;
    this.hands = null;
    this.active = false;
    this.useCamera = false;
    this.useMouse = false;

    // Current finger position in canvas coordinates
    this.fingerX = -100;
    this.fingerY = -100;
    this.fingerActive = false;
    this.smoothX = -100;
    this.smoothY = -100;

    // Mouse fallback
    this.mouseX = -100;
    this.mouseY = -100;
    this.mouseDown = false;
    this.mouseActive = false;

    this.onReady = null;   // callback when tracking is ready
    this.onError = null;   // callback if camera fails
  }

  /**
   * Start camera-based tracking. Fall back to mouse on failure.
   */
  async start() {
    try {
      await this._initCamera();
      await this._initMediaPipe();
      this.useCamera = true;
      this.active = true;
      if (this.onReady) this.onReady('camera');
    } catch (err) {
      console.warn('Camera failed:', err.message);
      this._initMouseFallback();
      if (this.onError) this.onError(err);
    }
  }

  /** Start mouse-only mode (no camera attempt) */
  startMouseOnly() {
    this._initMouseFallback();
    if (this.onReady) this.onReady('mouse');
  }

  async _initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();
    // Wait for video to have dimensions
    await new Promise(r => {
      if (this.video.videoWidth > 0) r();
      else this.video.addEventListener('loadedmetadata', r, { once: true });
    });
  }

  async _initMediaPipe() {
    const Hands = window.Hands;
    if (!Hands) throw new Error('MediaPipe Hands not loaded');

    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => this._onHandResults(results));

    // Start processing loop
    this._processCamera();
  }

  _processCamera() {
    if (!this.useCamera || !this.hands) return;
    this.hands.send({ image: this.video }).then(() => {
      requestAnimationFrame(() => this._processCamera());
    });
  }

  _onHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const hand = results.multiHandLandmarks[0];
      // Index finger tip = landmark 8
      const finger = hand[8];
      // Map normalized coords to canvas, mirror X
      const videoW = this.video.videoWidth || 640;
      const videoH = this.video.videoHeight || 480;

      // Mirror X for natural movement
      const nx = 1 - finger.x;
      const ny = finger.y;

      // Map to canvas coords, maintaining aspect ratio
      const canvasRatio = this.canvas.width / this.canvas.height;
      const videoRatio = videoW / videoH;

      let cx, cy;
      if (canvasRatio > videoRatio) {
        // Canvas is wider — video fills height, centered horizontally
        const scale = this.canvas.height / videoH;
        const videoDisplayW = videoW * scale;
        const offsetX = (this.canvas.width - videoDisplayW) / 2;
        cx = offsetX + nx * videoDisplayW;
        cy = ny * this.canvas.height;
      } else {
        // Canvas is taller — video fills width
        const scale = this.canvas.width / videoW;
        const videoDisplayH = videoH * scale;
        const offsetY = (this.canvas.height - videoDisplayH) / 2;
        cx = nx * this.canvas.width;
        cy = offsetY + ny * videoDisplayH;
      }

      this.fingerX = cx;
      this.fingerY = cy;
      this.fingerActive = true;
    } else {
      this.fingerActive = false;
    }
  }

  _initMouseFallback() {
    this.useMouse = true;
    this.active = true;

    // Always track mouse position for cursor display
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseActive = true; // cursor is on canvas
    });

    // Separate grab state from cursor visibility
    this.canvas.addEventListener('mousedown', () => {
      this.mouseDown = true;
      this.mouseActive = true;
    });

    this.canvas.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    // Track mouse leaving the canvas
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseActive = false;
    });

    // Touch support
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
      this.mouseDown = true;
      this.mouseActive = true;
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
      this.mouseDown = true;
      this.mouseActive = true;
    });

    this.canvas.addEventListener('touchend', () => {
      this.mouseDown = false;
    });
  }

  /**
   * Get the current tracked position in canvas coordinates.
   * Returns { x, y, active: bool }
   */
  getPosition() {
    if (this.useCamera) {
      this.smoothX += (this.fingerX - this.smoothX) * 0.3;
      this.smoothY += (this.fingerY - this.smoothY) * 0.3;
      const onCanvas = this.smoothX > 0 && this.smoothY > 0;
      return {
        x: this.smoothX,
        y: this.smoothY,
        grabbing: this.fingerActive,
        visible: this.fingerActive && onCanvas,
      };
    }
    if (this.useMouse) {
      return {
        x: this.mouseX,
        y: this.mouseY,
        grabbing: this.mouseDown,
        visible: this.mouseActive,
      };
    }
    return { x: -100, y: -100, grabbing: false, visible: false };
  }

  /** Stop the tracker */
  stop() {
    this.active = false;
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(t => t.stop());
    }
  }
}
