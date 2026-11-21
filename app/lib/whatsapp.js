/**
 * WhatsApp Helper Utilities for SMK YPK Digital Ecosystem
 * Converts Indonesian phone numbers into direct https://wa.me/ links
 */

export function formatWhatsAppUrl(rawPhone, text = '') {
  if (!rawPhone || rawPhone === '-') return '';
  
  // Strip everything except numbers
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits || digits.length < 8) return '';
  
  // Format standard Indonesian country code (+62)
  if (digits.startsWith('0')) {
    digits = '62' + digits.substring(1);
  } else if (digits.startsWith('62')) {
    // already starts with 62
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  }
  
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${encodedText}`;
}

export function isValidPhoneNumber(rawPhone) {
  if (!rawPhone || rawPhone === '-') return false;
  const digits = String(rawPhone).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}
