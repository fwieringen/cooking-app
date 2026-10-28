/* Cooking.com demo – validation rules (the "controls" in the application) */
window.CK_VALIDATE = (() => {
  const trim = (v) => (v == null ? '' : String(v).trim());

  const email = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trim(v));

  const required = (v) => trim(v).length > 0;

  const username = (v) => /^[a-zA-Z0-9_.-]{3,20}$/.test(trim(v));

  // At least 10 characters, one letter and one digit
  const password = (v) => typeof v === 'string' && v.length >= 10 && /[a-zA-Z]/.test(v) && /\d/.test(v);

  // International mobile number, e.g. +31612345678 or 0612345678
  const phone = (v) => /^(\+\d{8,15}|0\d{9})$/.test(trim(v).replace(/[\s-]/g, ''));

  // Postcode check differs per country (as described in the case)
  const postcode = (v, country) => {
    const s = trim(v).toUpperCase();
    switch (country) {
      case 'NL': return /^\d{4}\s?[A-Z]{2}$/.test(s);
      case 'BE': return /^\d{4}$/.test(s);
      case 'DE': case 'ES': case 'FR': return /^\d{5}$/.test(s);
      case 'AU': return /^\d{4}$/.test(s);
      case 'US': return /^\d{5}(-\d{4})?$/.test(s);
      case 'GB': return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(s);
      default: return s.length >= 3;
    }
  };

  // Luhn check for card numbers
  const cardNumber = (v) => {
    const s = trim(v).replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(s)) return false;
    let sum = 0, dbl = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let d = Number(s[i]);
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  };

  // MM/YY, not in the past
  const cardExpiry = (v, now = new Date()) => {
    const m = trim(v).match(/^(0[1-9]|1[0-2])\s?\/\s?(\d{2})$/);
    if (!m) return false;
    const month = Number(m[1]), year = 2000 + Number(m[2]);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    return endOfMonth >= now;
  };

  const cvc = (v) => /^\d{3,4}$/.test(trim(v));

  // Dutch Chamber of Commerce number: 8 digits
  const kvk = (v) => /^\d{8}$/.test(trim(v));

  // Dutch VAT number: NL + 9 digits + B + 2 digits
  const vatNL = (v) => /^NL\d{9}B\d{2}$/.test(trim(v).toUpperCase().replace(/\s/g, ''));

  // IBAN mod-97 check
  const iban = (v) => {
    const s = trim(v).toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    const rearranged = s.slice(4) + s.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let rem = 0;
    for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
    return rem === 1;
  };

  const guests = (n, max) => Number.isInteger(n) && n >= 1 && n <= max;

  // Reservation date: today or later, within the booking horizon
  const reservationDate = (isoDate, horizonDays, now = new Date()) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trim(isoDate))) return false;
    const d = new Date(isoDate + 'T00:00:00');
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const max = new Date(today); max.setDate(max.getDate() + horizonDays);
    return d >= today && d <= max;
  };

  return { email, required, username, password, phone, postcode, cardNumber, cardExpiry, cvc, kvk, vatNL, iban, guests, reservationDate };
})();
