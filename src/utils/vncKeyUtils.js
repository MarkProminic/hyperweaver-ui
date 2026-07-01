// X11 Keysym mappings for common keys
export const keysymMap = {
  // Function keys
  f1: 0xffbe,
  f2: 0xffbf,
  f3: 0xffc0,
  f4: 0xffc1,
  f5: 0xffc2,
  f6: 0xffc3,
  f7: 0xffc4,
  f8: 0xffc5,
  f9: 0xffc6,
  f10: 0xffc7,
  f11: 0xffc8,
  f12: 0xffc9,

  // Modifier keys
  ctrl: 0xffe3,
  alt: 0xffe9,
  shift: 0xffe1,

  // Common keys
  tab: 0xff09,
  return: 0xff0d,
  escape: 0xff1b,
  delete: 0xffff,

  // Letters (lowercase)
  a: 0x061,
  b: 0x062,
  c: 0x063,
  d: 0x064,
  e: 0x065,
  f: 0x066,
  g: 0x067,
  h: 0x068,
  i: 0x069,
  j: 0x06a,
  k: 0x06b,
  l: 0x06c,
  m: 0x06d,
  n: 0x06e,
  o: 0x06f,
  p: 0x070,
  q: 0x071,
  r: 0x072,
  s: 0x073,
  t: 0x074,
  u: 0x075,
  v: 0x076,
  w: 0x077,
  x: 0x078,
  y: 0x079,
  z: 0x07a,

  // Numbers
  0: 0x030,
  1: 0x031,
  2: 0x032,
  3: 0x033,
  4: 0x034,
  5: 0x035,
  6: 0x036,
  7: 0x037,
  8: 0x038,
  9: 0x039,
};

// Function to send keys with modifiers using the proper react-vnc/noVNC API
export const sendKeyWithModifiers = (vncRef, keysym, keyCode, modifiers) => {
  if (!vncRef.sendKey) {
    console.warn('VNC sendKey method not available');
    return;
  }

  try {
    // Step 1: Send modifier keys DOWN
    for (const modifier of modifiers) {
      const modifierKeysym = keysymMap[modifier];
      if (modifierKeysym) {
        console.log(
          `🎹 VNC KEYS: Sending ${modifier} DOWN (keysym: 0x${modifierKeysym.toString(16)})`
        );
        vncRef.sendKey(
          modifierKeysym,
          `${modifier.charAt(0).toUpperCase() + modifier.slice(1)}Left`,
          true
        );
      }
    }

    // Step 2: Send target key (if down not specified, both press and release are sent)
    console.log(`🎹 VNC KEYS: Sending ${keyCode} (keysym: 0x${keysym.toString(16)})`);
    vncRef.sendKey(keysym, keyCode);

    // Step 3: Send modifier keys UP (in reverse order)
    for (let i = modifiers.length - 1; i >= 0; i--) {
      const modifier = modifiers[i];
      const modifierKeysym = keysymMap[modifier];
      if (modifierKeysym) {
        console.log(
          `🎹 VNC KEYS: Sending ${modifier} UP (keysym: 0x${modifierKeysym.toString(16)})`
        );
        vncRef.sendKey(
          modifierKeysym,
          `${modifier.charAt(0).toUpperCase() + modifier.slice(1)}Left`,
          false
        );
      }
    }
  } catch (error) {
    console.error('❌ VNC KEYS: Error sending key with modifiers:', error);
  }
};
