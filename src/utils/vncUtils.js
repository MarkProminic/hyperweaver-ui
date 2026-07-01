/**
 * Character-to-keysym mapping for typing simulation
 */
const SYMBOL_KEYSYMS = {
  ' ': 0x20, // space
  '!': 0x21, // exclamation
  '"': 0x22, // quotation
  '#': 0x23, // hash
  $: 0x24, // dollar
  '%': 0x25, // percent
  '&': 0x26, // ampersand
  "'": 0x27, // apostrophe
  '(': 0x28, // left parenthesis
  ')': 0x29, // right parenthesis
  '*': 0x2a, // asterisk
  '+': 0x2b, // plus
  ',': 0x2c, // comma
  '-': 0x2d, // minus
  '.': 0x2e, // period
  '/': 0x2f, // slash
  ':': 0x3a, // colon
  ';': 0x3b, // semicolon
  '<': 0x3c, // less than
  '=': 0x3d, // equals
  '>': 0x3e, // greater than
  '?': 0x3f, // question mark
  '@': 0x40, // at
  '[': 0x5b, // left bracket
  '\\': 0x5c, // backslash
  ']': 0x5d, // right bracket
  '^': 0x5e, // caret
  _: 0x5f, // underscore
  '`': 0x60, // grave accent
  '{': 0x7b, // left brace
  '|': 0x7c, // pipe
  '}': 0x7d, // right brace
  '~': 0x7e, // tilde
  '\n': 0xff0d, // Return/Enter
  '\r': 0xff0d, // Return/Enter
  '\t': 0xff09, // Tab
};

export const getKeysymForChar = char => {
  const code = char.charCodeAt(0);

  // Letters (a-z, A-Z)
  if (char >= 'a' && char <= 'z') {
    return 0x61 + (code - 97);
  } // a=0x61
  if (char >= 'A' && char <= 'Z') {
    return 0x41 + (code - 65);
  } // A=0x41

  // Numbers (0-9)
  if (char >= '0' && char <= '9') {
    return 0x30 + (code - 48);
  } // 0=0x30

  return SYMBOL_KEYSYMS[char] || code;
};

/**
 * Character-to-KeyboardEvent.code mapping
 */
const SYMBOL_KEYCODES = {
  ' ': 'Space',
  '\n': 'Enter',
  '\r': 'Enter',
  '\t': 'Tab',
  '!': 'Digit1', // Shift+1
  '@': 'Digit2', // Shift+2
  '#': 'Digit3', // Shift+3
  $: 'Digit4', // Shift+4
  '%': 'Digit5', // Shift+5
  '^': 'Digit6', // Shift+6
  '&': 'Digit7', // Shift+7
  '*': 'Digit8', // Shift+8
  '(': 'Digit9', // Shift+9
  ')': 'Digit0', // Shift+0
  '-': 'Minus',
  _: 'Minus', // Shift+Minus
  '=': 'Equal',
  '+': 'Equal', // Shift+Equal
  '[': 'BracketLeft',
  '{': 'BracketLeft', // Shift+BracketLeft
  ']': 'BracketRight',
  '}': 'BracketRight', // Shift+BracketRight
  '\\': 'Backslash',
  '|': 'Backslash', // Shift+Backslash
  ';': 'Semicolon',
  ':': 'Semicolon', // Shift+Semicolon
  "'": 'Quote',
  '"': 'Quote', // Shift+Quote
  '`': 'Backquote',
  '~': 'Backquote', // Shift+Backquote
  ',': 'Comma',
  '<': 'Comma', // Shift+Comma
  '.': 'Period',
  '>': 'Period', // Shift+Period
  '/': 'Slash',
  '?': 'Slash', // Shift+Slash
};

export const getKeyCodeForChar = char => {
  // Letters
  if (char >= 'a' && char <= 'z') {
    return `Key${char.toUpperCase()}`;
  }
  if (char >= 'A' && char <= 'Z') {
    return `Key${char}`;
  }

  // Numbers
  if (char >= '0' && char <= '9') {
    return `Digit${char}`;
  }

  return SYMBOL_KEYCODES[char] || null;
};

/**
 * Check if character needs shift modifier
 */
export const needsShiftKey = char =>
  (char >= 'A' && char <= 'Z') || '!@#$%^&*()_+{}|:"<>?~'.includes(char);

/**
 * Helper to determine status color class
 */
export const getStatusColorClass = (connected, connecting) => {
  if (connected) {
    return 'text-success';
  }
  if (connecting) {
    return 'text-warning';
  }
  return 'text-danger';
};

/**
 * Simulate typing text by sending key events
 */
export const performTyping = async (vncRef, connected, text) => {
  if (!vncRef.current || !connected) {
    console.warn(`⚠️ VNC-VIEWER: Cannot type text - not connected or ref unavailable`);
    return false;
  }

  console.log(`📋 VNC-VIEWER: Starting character-by-character typing of ${text.length} characters`);

  try {
    // Send each character as a key event
    const typeNextChar = async i => {
      if (i >= text.length) {
        return;
      }
      const char = text[i];
      const keysym = getKeysymForChar(char);
      const keyCode = getKeyCodeForChar(char);
      const requiresShift = needsShiftKey(char);

      console.log(
        `📋 VNC-VIEWER: Typing character '${char}' (${i + 1}/${text.length}) - keysym: 0x${keysym.toString(16)}, keyCode: ${keyCode}, shift: ${requiresShift}`
      );

      try {
        if (requiresShift && keyCode) {
          // Send Shift+Key for uppercase letters and symbols
          vncRef.current.sendKey(0xffe1, 'ShiftLeft', true); // Shift down
          vncRef.current.sendKey(keysym, keyCode); // Character
          vncRef.current.sendKey(0xffe1, 'ShiftLeft', false); // Shift up
        } else if (keyCode) {
          // Send regular key
          vncRef.current.sendKey(keysym, keyCode);
        } else {
          // Fallback: send keysym only
          vncRef.current.sendKey(keysym, null);
        }

        // Longer delay between characters for TTY console compatibility
        if (i < text.length - 1) {
          await new Promise(resolve => {
            setTimeout(resolve, 50);
          }); // 50ms delay for better TTY compatibility
        }
      } catch (err) {
        console.error(`❌ VNC-VIEWER: Error typing character '${char}':`, err);
      }
      await typeNextChar(i + 1);
    };

    await typeNextChar(0);

    console.log(`✅ VNC-VIEWER: Finished typing ${text.length} characters`);
    return true;
  } catch (err) {
    console.error(`❌ VNC-VIEWER: Error in character-by-character typing:`, err);
    return false;
  }
};

/**
 * Send a key event
 */
export const performSendKey = (vncRef, connected, keysym, code, down) => {
  if (vncRef.current && connected) {
    console.log(
      `🎹 VNC-VIEWER: Forwarding sendKey(keysym: ${keysym}, code: "${code}", down: ${down})`
    );
    try {
      return vncRef.current.sendKey(keysym, code, down);
    } catch (err) {
      console.error(`❌ VNC-VIEWER: Error sending key:`, err);
      return false;
    }
  } else {
    console.warn(`⚠️ VNC-VIEWER: Cannot send key - not connected or ref unavailable`);
    return false;
  }
};

/**
 * Send Ctrl+Alt+Del
 */
export const performCtrlAltDel = (vncRef, connected) => {
  if (vncRef.current && connected) {
    console.log(`🎹 VNC-VIEWER: Forwarding sendCtrlAltDel()`);
    try {
      return vncRef.current.sendCtrlAltDel();
    } catch (err) {
      console.error(`❌ VNC-VIEWER: Error sending Ctrl+Alt+Del:`, err);
      return false;
    }
  } else {
    console.warn(`⚠️ VNC-VIEWER: Cannot send Ctrl+Alt+Del - not connected or ref unavailable`);
    return false;
  }
};
