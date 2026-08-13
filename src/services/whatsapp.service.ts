import * as parentModel from '../models/parent.model';
import { config, logger } from '../utils';

export function isWhatsAppConfigured(): boolean {
  return Boolean(config.WHATSAPP_TOKEN?.trim() && config.WHATSAPP_PHONE_NUMBER_ID?.trim());
}

/** Egypt local 01XXXXXXXXX → 201XXXXXXXXX; otherwise digits with country code. */
export function toWhatsAppAddress(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^01\d{9}$/.test(digits)) digits = `20${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export async function notifyStudentAbsent(input: {
  schoolId: number;
  studentId: number;
  studentName: string;
  date: string;
}): Promise<void> {
  if (!isWhatsAppConfigured()) {
    logger.info({ studentId: input.studentId }, 'WhatsApp absence skipped: credentials not set');
    return;
  }

  try {
    const parent = await parentModel.findByStudentId(input.studentId, input.schoolId);
    const phone = parent?.whatsapp_number?.trim();
    if (!phone) {
      logger.info(
        { studentId: input.studentId },
        'WhatsApp absence skipped: no parent whatsapp_number',
      );
      return;
    }

    const to = toWhatsAppAddress(phone);
    if (!to) {
      logger.warn({ studentId: input.studentId, phone }, 'WhatsApp absence skipped: invalid number');
      return;
    }

    const url = `https://graph.facebook.com/${config.WHATSAPP_API_VERSION}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const templateName = config.WHATSAPP_TEMPLATE_NAME.trim();
    const payload = templateName
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: config.WHATSAPP_TEMPLATE_LANG },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: input.studentName },
                  { type: 'text', text: input.date },
                ],
              },
            ],
          },
        }
      : {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: `تنبيه غياب: تم تسجيل غياب الطالب ${input.studentName} بتاريخ ${input.date}`,
          },
        };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.warn(
        { status: res.status, errText, studentId: input.studentId },
        'WhatsApp absence send failed',
      );
    }
  } catch (err) {
    logger.warn({ err, studentId: input.studentId }, 'WhatsApp absence send failed');
  }
}
