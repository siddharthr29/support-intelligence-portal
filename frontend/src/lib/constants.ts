/**
 * Static Company and Group Name Mappings
 * 
 * These are hardcoded because company and group names rarely change.
 * This eliminates the need to fetch them from the database on every request.
 */

// Freshdesk Group ID to Name mapping
export const GROUP_NAMES: Record<number, string> = {
  36000098156: 'Support Engineers',
  36000098158: 'Product Support',
  36000247507: 'Support Engineers',
  36000247508: 'Product Support',
  36000441443: 'Implementation Team',
  36000457181: 'Unassigned',
};

// Freshdesk Company ID to Name mapping (from database)
export const COMPANY_NAMES: Record<number, string> = {
  36000114441: 'Sewa Rural',
  36000275205: 'LBP',
  36000313842: 'Tata Trusts',
  36000390923: 'Gudalur Adivasi Hospital',
  36000391758: 'Calcutta Kids',
  36000401544: 'JSS MP Phulwari',
  36000424542: 'Kalap Trust',
  36000459910: 'JSS MP Sickle Cell',
  36000468964: 'Dam Desilting Mission',
  36000488269: 'Samanvay Research and Development Foundation',
  36000504379: 'Chetna-SNEHA',
  36000505792: 'Bharti Vidyapeeth Medical Collage',
  36000526247: 'Hasiru Dala',
  36000526249: 'IHMP',
  36000545137: 'JSS CP',
  36000600975: 'SATHI',
  36000600976: 'Jashoda Narottam Trust (JNPCT)',
  36000602706: 'Shelter Associates',
  36000645966: 'SNCU',
  36000646002: 'Yenepoya (Deemed to be University)',
  36000671709: 'RWB',
  36000674302: 'Rythu Swarajya Vedika',
  36000681269: 'JSS Singrauli',
  36000685925: 'Setco',
  36000687306: 'MahaPeconet',
  36000691464: 'STCATP',
  36000692182: 'Saahas',
  36000698147: 'YW NXT',
  36000736876: 'Muktipath',
  36000738946: 'STC-CV',
  36000745776: 'SSSMA',
  36000758472: 'LFE',
  36000758674: 'Lend a Hand India',
  36000770405: 'APF',
  36000793211: 'PoWER',
  36000796491: 'Rise Against Hunger India',
  36000798077: 'Swach',
  36000808847: 'Swasthya Swaraj',
  36000822776: 'AKRSP',
  36000856162: 'Mobile Creche',
  36000861488: 'Goonj',
  36000885806: 'IPH Cohort',
  36000887293: 'Deepak Foundation',
  36000887297: 'Avni L2 support',
  36000887299: 'Swadhar',
  36000887307: 'Uninhibited',
  36000913106: 'IPH Sickle Cell',
  36000914108: 'Chashma',
  36000925540: 'Animedh Charitable Trust',
  36000930635: 'CINI',
  36000989803: 'Healthchecks',
  36001004903: 'Project Potential',
  36001019007: 'MLD Trust',
  36001019194: 'Maitrayana',
  36001024580: 'Purna Clinic',
  36001047263: 'Gram Seva Trust',
};

// Freshdesk Status codes
export const FRESHDESK_STATUS = {
  OPEN: 2,
  PENDING: 3,
  RESOLVED: 4,
  CLOSED: 5,
} as const;

// Freshdesk Priority codes
export const FRESHDESK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

// Helper functions
export function getGroupName(groupId: number): string {
  return GROUP_NAMES[groupId] || `Group ${groupId}`;
}

export function getCompanyName(companyId: number): string {
  return COMPANY_NAMES[companyId] || `Company ${companyId}`;
}
