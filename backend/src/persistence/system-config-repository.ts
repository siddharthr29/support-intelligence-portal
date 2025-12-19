import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';

// Encryption key derived from a secret (in production, use a proper key management service)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production-32';
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface SystemConfigEntry {
  key: string;
  value: string;
  encrypted: boolean;
  updatedAt: Date;
}

/**
 * Get a system configuration value.
 * Encrypted values are automatically decrypted.
 */
export async function getConfig(key: string): Promise<string | null> {
  const prisma = getPrismaClient();

  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });

  if (!config) return null;

  if (config.encrypted) {
    try {
      return decrypt(config.value);
    } catch (error) {
      logger.error({ key, error }, 'Failed to decrypt config value');
      return null;
    }
  }

  return config.value;
}

/**
 * Set a system configuration value.
 * Sensitive values should be encrypted.
 */
export async function setConfig(
  key: string,
  value: string,
  shouldEncrypt: boolean = false
): Promise<void> {
  const prisma = getPrismaClient();

  const storedValue = shouldEncrypt ? encrypt(value) : value;

  // Use key as primary key
  await prisma.systemConfig.upsert({
    where: { key },
    create: {
      key,
      value: storedValue,
      encrypted: shouldEncrypt,
    },
    update: {
      value: storedValue,
      encrypted: shouldEncrypt,
    },
  });

  logger.info({ key, encrypted: shouldEncrypt }, 'System config updated');
}

/**
 * Get all config keys (values are masked for sensitive data).
 */
export async function listConfigs(): Promise<SystemConfigEntry[]> {
  const prisma = getPrismaClient();

  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  });

  return configs.map(config => ({
    key: config.key,
    value: config.encrypted ? '********' : config.value,
    encrypted: config.encrypted,
    updatedAt: config.updatedAt,
  }));
}

/**
 * Delete a config entry.
 */
export async function deleteConfig(key: string): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.systemConfig.delete({
    where: { key },
  }).catch(() => {
    // Ignore if not found
  });
}
