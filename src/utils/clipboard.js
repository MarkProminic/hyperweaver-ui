/**
 * Copy text to the clipboard in BOTH secure and insecure contexts.
 *
 * navigator.clipboard exists only on https/localhost (secure contexts). Direct
 * mode is routinely plain http://host:port, where the only working mechanism is
 * the legacy execCommand path via a temporary off-screen textarea.
 *
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} true if the copy succeeded
 */
export const copyText = async text => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or transient failure — fall through to the legacy path
    }
  }

  const scratch = document.createElement('textarea');
  scratch.value = text;
  scratch.setAttribute('readonly', '');
  scratch.style.position = 'fixed';
  scratch.style.left = '-9999px';
  document.body.appendChild(scratch);
  scratch.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(scratch);
  return copied;
};
