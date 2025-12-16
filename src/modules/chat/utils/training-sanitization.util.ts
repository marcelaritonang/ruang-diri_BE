/**
 * Training data sanitization utilities for E2E chat
 * Removes PII and sensitive information before training export
 */

export interface SanitizationRules {
  piiPatterns: string[];
  redactionStrategy: 'mask' | 'remove' | 'placeholder';
  retainStructure: boolean;
}

export interface TrainingMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TrainingSession {
  session_id: string;
  started_at: string;
  ended_at: string;
  context: {
    channel: 'counseling';
    locale: string;
    consent: 'granted_at_registration';
  };
  messages: TrainingMessage[];
  labels?: {
    intent?: string[];
    techniques?: string[];
    outcome?: string;
  };
}

// Common PII patterns
const DEFAULT_PII_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  /(\+?62[-.\s]?)?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g,

  // Indonesian ID numbers (NIK - 16 digits)
  /\b\d{16}\b/g,

  // Credit card numbers
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // Social security numbers (US format)
  /\b\d{3}-\d{2}-\d{4}\b/g,

  // Indonesian NPWP (tax ID)
  /\b\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}\b/g,

  // Bank account numbers (8-16 digits)
  /\b\d{8,16}\b/g,

  // Addresses with numbers
  /\b\d+\s+[A-Za-z\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Jalan|Jl)\b/gi,

  // Indonesian postal codes
  /\b\d{5}\b/g,
];

// Common name patterns (to be replaced with placeholders)
const NAME_PATTERNS = [
  // Indonesian names with common titles
  /\b(Bapak|Pak|Ibu|Bu|Saudara|Sdr|Sdri)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,

  // Western names (capitalized words)
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g,
];

/**
 * Sanitize a single message content
 */
export function sanitizeMessageContent(
  content: string,
  rules: SanitizationRules,
): string {
  let sanitized = content;

  // Apply default PII patterns
  for (const pattern of DEFAULT_PII_PATTERNS) {
    sanitized = sanitized.replace(
      pattern,
      getReplacementText(rules.redactionStrategy, 'PII'),
    );
  }

  // Apply custom PII patterns
  for (const patternStr of rules.piiPatterns) {
    try {
      const pattern = new RegExp(patternStr, 'gi');
      sanitized = sanitized.replace(
        pattern,
        getReplacementText(rules.redactionStrategy, 'CUSTOM_PII'),
      );
    } catch (error) {
      console.warn(`Invalid regex pattern: ${patternStr}`);
    }
  }

  // Replace names with placeholders
  for (const namePattern of NAME_PATTERNS) {
    sanitized = sanitized.replace(
      namePattern,
      getReplacementText(rules.redactionStrategy, 'NAME'),
    );
  }

  // If not retaining structure, remove extra whitespace
  if (!rules.retainStructure) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }

  return sanitized;
}

/**
 * Get replacement text based on redaction strategy
 */
function getReplacementText(strategy: string, type: string): string {
  switch (strategy) {
    case 'mask':
      return '***';
    case 'remove':
      return '';
    case 'placeholder':
    default:
      return `[${type}_REDACTED]`;
  }
}

/**
 * Sanitize an entire training session
 */
export function sanitizeTrainingSession(
  sessionData: any,
  rules: SanitizationRules,
): TrainingSession {
  const sanitizedMessages: TrainingMessage[] = sessionData.messages.map(
    (msg: any) => ({
      role: msg.role,
      content: sanitizeMessageContent(msg.content, rules),
      timestamp: msg.timestamp,
    }),
  );

  return {
    session_id: sessionData.session_id,
    started_at: sessionData.started_at,
    ended_at: sessionData.ended_at,
    context: {
      channel: 'counseling',
      locale: sessionData.context?.locale || 'en',
      consent: 'granted_at_registration',
    },
    messages: sanitizedMessages,
    labels: sessionData.labels || {},
  };
}

/**
 * Validate if content contains potential PII
 */
export function detectPotentialPII(content: string): {
  hasPII: boolean;
  detectedTypes: string[];
} {
  const detectedTypes: string[] = [];

  // Check against default patterns
  const checks = [
    { pattern: DEFAULT_PII_PATTERNS[0], type: 'email' },
    { pattern: DEFAULT_PII_PATTERNS[1], type: 'phone' },
    { pattern: DEFAULT_PII_PATTERNS[2], type: 'id_number' },
    { pattern: DEFAULT_PII_PATTERNS[3], type: 'credit_card' },
    { pattern: DEFAULT_PII_PATTERNS[4], type: 'ssn' },
    { pattern: DEFAULT_PII_PATTERNS[5], type: 'tax_id' },
    { pattern: DEFAULT_PII_PATTERNS[6], type: 'bank_account' },
    { pattern: DEFAULT_PII_PATTERNS[7], type: 'address' },
  ];

  for (const check of checks) {
    if (check.pattern.test(content)) {
      detectedTypes.push(check.type);
    }
  }

  return {
    hasPII: detectedTypes.length > 0,
    detectedTypes,
  };
}

/**
 * Generate export statistics
 */
export function generateExportStats(sessions: TrainingSession[]): {
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  sanitizationApplied: boolean;
  exportedAt: string;
} {
  const totalMessages = sessions.reduce(
    (sum, session) => sum + session.messages.length,
    0,
  );

  return {
    totalSessions: sessions.length,
    totalMessages,
    averageMessagesPerSession: Math.round(totalMessages / sessions.length),
    sanitizationApplied: true,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Convert to JSONL format for training
 */
export function formatAsJSONL(sessions: TrainingSession[]): string {
  return sessions.map((session) => JSON.stringify(session)).join('\n');
}

/**
 * Default sanitization rules for counseling data
 */
export const DEFAULT_COUNSELING_SANITIZATION_RULES: SanitizationRules = {
  piiPatterns: [
    // Indonesian-specific patterns
    '\\b[A-Z]{2}\\s\\d{4}\\s[A-Z]{2}\\b', // License plates
    '\\bNIK[\\s:]*\\d{16}\\b', // NIK with label
    '\\bKTP[\\s:]*\\d{16}\\b', // KTP with label

    // Medical terms that might be sensitive
    '\\b(HIV|AIDS|depression medication|antidepressant)\\b',

    // Location-specific
    '\\b(RT\\s\\d+|RW\\s\\d+)\\b', // Indonesian neighborhood codes
  ],
  redactionStrategy: 'placeholder',
  retainStructure: true,
};

/**
 * Encrypt sanitized data for analytics
 */
export async function encryptForAnalytics(
  jsonlData: string,
  analyticsPublicKeyB64: string,
): Promise<string> {
  // This is a placeholder implementation
  // In a real system, you'd use the analytics public key to encrypt the data

  try {
    // Convert data to bytes
    const dataBytes = new TextEncoder().encode(jsonlData);

    // For now, just base64 encode (in production, use proper encryption)
    const encrypted = Buffer.from(dataBytes).toString('base64');

    return encrypted;
  } catch (error) {
    throw new Error(`Failed to encrypt training data: ${error.message}`);
  }
}

/**
 * Validate training export data
 */
export function validateTrainingData(sessions: TrainingSession[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const session of sessions) {
    if (!session.session_id) {
      errors.push('Missing session_id');
    }

    if (!session.started_at || !session.ended_at) {
      errors.push(`Session ${session.session_id}: Missing timestamps`);
    }

    if (!session.messages || session.messages.length === 0) {
      errors.push(`Session ${session.session_id}: No messages`);
    }

    if (session.context?.consent !== 'granted_at_registration') {
      errors.push(`Session ${session.session_id}: Invalid consent status`);
    }

    // Check for potential PII that wasn't sanitized
    for (const message of session.messages || []) {
      const piiCheck = detectPotentialPII(message.content);
      if (piiCheck.hasPII) {
        errors.push(
          `Session ${session.session_id}: Potential PII detected in message: ${piiCheck.detectedTypes.join(', ')}`,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
