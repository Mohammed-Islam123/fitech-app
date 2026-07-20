// src/services/nfcScanner.js

class NFCScannerService {
  constructor() {
    this.isListening = false;
    this.scanTimeout = null;
    this.callbacks = {
      onScan: null,
      onError: null,
      onStatusChange: null
    };
    this.lastScannedUid = null;
    this.lastScannedTime = 0;
    this._diagAllowed = 0;
    this._diagBlocked = 0;
    this.hiddenInput = null;
    this._blurHandler = null;
    this._keydownHandler = null;
  }

  /**
   * Check if an element is a form field that should keep focus
   */
  _isFormField(element) {
    if (!element) return false;
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.tagName === 'SELECT' ||
      element.isContentEditable
    );
  }

  /**
   * Re-focus the hidden input unless a form field is active
   */
  _refocus() {
    if (!this.isListening || !this.hiddenInput) return;
    if (this._isFormField(document.activeElement)) {
      this.log('Refocus blocked — form field is active:', document.activeElement?.name || document.activeElement?.id || document.activeElement?.tagName);
      return;
    }
    this.hiddenInput.focus();
    this.log('Refocused hidden input. Focused:', document.activeElement === this.hiddenInput);
  }

  /**
   * Initialize the NFC scanner service
   * @param {Object} options - Configuration options
   * @param {number} options.timeout - Timeout in ms to wait for complete scan (default: 100)
   * @param {boolean} options.debug - Enable debug logging (default: false)
   */
  init(options = {}) {
    this.timeout = options.timeout || 100;
    this.debug = options.debug || false;

    // Create a hidden input element for reliable card reader capture.
    // HTML inputs have native OS-level keyboard buffering that guarantees
    // every character is captured even at USB reader speed. This is the
    // same mechanism that makes AddMemberModal's <input> work perfectly.
    // NOTE: pointer-events:none or off-screen positioning prevents focus,
    // so we keep the element in the viewport but make it invisible.
    if (!this.hiddenInput) {
      this.hiddenInput = document.createElement('input');
      this.hiddenInput.type = 'text';
      this.hiddenInput.style.cssText =
        'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;margin:0;border:0;opacity:0;overflow:hidden;z-index:-1;';
      this.hiddenInput.autocomplete = 'off';
      this.hiddenInput.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.hiddenInput);
    }

    // When the hidden input loses focus, re-focus it after a short delay
    // unless the user is interacting with a form field (search box, etc.).
    this._blurHandler = () => {
      this.log('Hidden input blurred. Active element:', document.activeElement?.tagName, document.activeElement?.name || '');
      setTimeout(() => this._refocus(), 50);
    };

    // Handle Enter to trigger scan; all other keys are buffered by the
    // input element automatically.
    this._keydownHandler = (event) => {
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const cardUid = this.hiddenInput.value.trim();
        this.hiddenInput.value = '';
        if (cardUid) {
          this._processScan(cardUid);
        } else {
          this.log('Enter pressed but input is empty');
        }
        return;
      }

      this.log('Key pressed:', event.key, '| Current value:', this.hiddenInput.value);

      // Reset timeout on every keystroke so rapid scans don't time out
      this.scanTimeout = setTimeout(() => {
        if (this.hiddenInput) this.hiddenInput.value = '';
        this.scanTimeout = null;
      }, this.timeout);
    };

    this.log('NFC Scanner Service initialized');
  }

  /**
   * Start listening for NFC card scans
   * @param {Object} callbacks - Callback functions
   */
  start(callbacks = {}) {
    if (this.isListening) {
      this.log('Already listening for NFC scans');
      return;
    }

    this.callbacks = { ...this.callbacks, ...callbacks };

    if (this.hiddenInput) {
      this.hiddenInput.addEventListener('blur', this._blurHandler);
      this.hiddenInput.addEventListener('keydown', this._keydownHandler);
      this.hiddenInput.focus();
      this.log('Hidden input focused:', document.activeElement === this.hiddenInput);
    }

    this.isListening = true;
    this.callbacks.onStatusChange?.(true);
    this.log('Started listening for NFC scans');
  }

  /**
   * Stop listening for NFC card scans
   */
  stop() {
    if (!this.isListening) {
      return;
    }

    if (this.hiddenInput) {
      this.hiddenInput.removeEventListener('blur', this._blurHandler);
      this.hiddenInput.removeEventListener('keydown', this._keydownHandler);
      this.hiddenInput.blur();
      this.hiddenInput.value = '';
    }

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    this.isListening = false;
    this.callbacks.onStatusChange?.(false);
    console.log('[nfcScanner:STOP] dedup state RESET (lastUid cleared)');
    this.lastScannedUid = null;
    this.lastScannedTime = 0;
    this.log('Stopped listening for NFC scans');
  }

  /**
   * Process a completed scan with deduplication
   */
  _processScan(cardUid) {
    this.log('Scan complete:', cardUid);

    // Debounce: ignore repeated scans of the same card while it remains
    // on the reader. Most readers continuously poll — this prevents
    // spamming the API with the same unregistered card.
    const now = Date.now();
    const timeSinceLast = now - this.lastScannedTime;
    const isDuplicate = cardUid === this.lastScannedUid && timeSinceLast < 30000;

    console.log(
      '[nfcScanner:DEDUP] uid=%s | lastUid=%s | lastTime=%d | now=%d | delta=%dms | duplicate=%s | allowedSoFar=%d | blockedSoFar=%d',
      cardUid, this.lastScannedUid, this.lastScannedTime, now, timeSinceLast,
      isDuplicate, this._diagAllowed, this._diagBlocked
    );

    if (isDuplicate) {
      this._diagBlocked++;
      return;
    }
    this._diagAllowed++;
    this.lastScannedUid = cardUid;
    this.lastScannedTime = now;

    this.callbacks.onScan?.(cardUid);
  }

  /**
   * Simulate a card scan (for testing purposes)
   * @param {string} cardUid
   */
  simulateScan(cardUid) {
    if (this.debug) {
      this.log('Simulating scan:', cardUid);
    }
    this.callbacks.onScan?.(cardUid);
  }

  /**
   * Check if service is currently listening
   */
  isActive() {
    return this.isListening;
  }

  /**
   * Log debug messages
   */
  log(...args) {
    if (this.debug) {
      console.log('[NFCScanner]', ...args);
    }
  }
}

// Create a singleton instance
const nfcScanner = new NFCScannerService();

export default nfcScanner;
