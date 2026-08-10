import { HttpError } from '../utils';

/** Egyptian national ID: C YY MM DD ... digit13 (gender odd=male). */
export function parseEgyptianNationalId(nationalId: string): {
  dateOfBirth: string;
  gender: 'male' | 'female';
} {
  const d = nationalId.replace(/\D/g, '');
  if (d.length !== 14) {
    throw new HttpError(400, 'الرقم القومي يجب أن يكون 14 رقمًا');
  }

  const c = parseInt(d[0]!, 10);
  const yy = parseInt(d.slice(1, 3), 10);
  const mm = parseInt(d.slice(3, 5), 10);
  const dd = parseInt(d.slice(5, 7), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    throw new HttpError(400, 'الرقم القومي غير صالح (تاريخ الميلاد)');
  }

  let year: number;
  if (c === 2) year = 1900 + yy;
  else if (c === 3) year = 2000 + yy;
  else if (c === 1) year = 1800 + yy;
  else year = 1900 + yy;

  const dateOfBirth = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const genderDigit = parseInt(d[12]!, 10);
  const gender: 'male' | 'female' = genderDigit % 2 === 1 ? 'male' : 'female';

  return { dateOfBirth, gender };
}
