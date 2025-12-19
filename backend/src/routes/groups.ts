import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSecureConfig } from '../services/secure-config';
import { logger } from '../utils/logger';

// Known group names (fallback when API doesn't have permission)
// These are extracted from Freshdesk admin panel
const KNOWN_GROUPS: Record<number, string> = {
  36000098156: 'Support Engineers',
  36000098158: 'Product Support',
  36000441443: 'Implementation',
  36000247507: 'Support Engineers',
  36000247508: 'Product Support',
};

// Cache for group names (refresh every 24 hours)
let groupNamesCache: Map<number, string> = new Map();
let cacheLastUpdated = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting
let lastFreshdeskRequest = 0;
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests

async function fetchGroupsFromFreshdesk(): Promise<Map<number, string>> {
  const freshdeskDomain = await getSecureConfig('FRESHDESK_DOMAIN') || process.env.FRESHDESK_DOMAIN;
  const freshdeskApiKey = await getSecureConfig('FRESHDESK_API_KEY', true) || process.env.FRESHDESK_API_KEY;

  if (!freshdeskDomain || !freshdeskApiKey) {
    logger.warn('Freshdesk credentials not configured for group fetch');
    return new Map(Object.entries(KNOWN_GROUPS).map(([k, v]) => [Number(k), v]));
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastFreshdeskRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - (now - lastFreshdeskRequest)));
  }
  lastFreshdeskRequest = Date.now();

  try {
    const response = await fetch(`https://${freshdeskDomain}/api/v2/groups`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${freshdeskApiKey}:X`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Freshdesk groups API not accessible, using known groups');
      return new Map(Object.entries(KNOWN_GROUPS).map(([k, v]) => [Number(k), v]));
    }

    const groups = await response.json() as { id: number; name: string }[];
    const groupMap = new Map<number, string>();

    for (const group of groups) {
      groupMap.set(group.id, group.name);
    }

    // Merge with known groups as fallback
    for (const [id, name] of Object.entries(KNOWN_GROUPS)) {
      if (!groupMap.has(Number(id))) {
        groupMap.set(Number(id), name);
      }
    }

    logger.info({ groupCount: groupMap.size }, 'Fetched groups from Freshdesk');
    return groupMap;
  } catch (error) {
    logger.error({ error }, 'Error fetching groups from Freshdesk, using known groups');
    return new Map(Object.entries(KNOWN_GROUPS).map(([k, v]) => [Number(k), v]));
  }
}

async function getGroupNames(): Promise<Map<number, string>> {
  const now = Date.now();

  // Return cache if still valid
  if (groupNamesCache.size > 0 && now - cacheLastUpdated < CACHE_TTL_MS) {
    return groupNamesCache;
  }

  // Fetch fresh data
  groupNamesCache = await fetchGroupsFromFreshdesk();
  cacheLastUpdated = now;

  return groupNamesCache;
}

interface GroupLookupBody {
  groupIds: number[];
}

export async function registerGroupsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all groups
  fastify.get('/api/groups', async (_request, reply) => {
    try {
      const groups = await getGroupNames();
      const groupList = Array.from(groups.entries()).map(([id, name]) => ({ id, name }));

      return reply.send({
        success: true,
        data: groupList,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch groups');
      throw error;
    }
  });

  // Lookup group names by IDs
  fastify.post<{ Body: GroupLookupBody }>(
    '/api/groups/lookup',
    async (request: FastifyRequest<{ Body: GroupLookupBody }>, reply: FastifyReply) => {
      const { groupIds } = request.body;

      if (!groupIds || !Array.isArray(groupIds)) {
        return reply.status(400).send({
          success: false,
          error: 'groupIds array is required',
        });
      }

      try {
        const groups = await getGroupNames();
        const result: Record<number, string> = {};

        for (const id of groupIds) {
          result[id] = groups.get(id) || `Group ${id}`;
        }

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to lookup group names');
        throw error;
      }
    }
  );
}
