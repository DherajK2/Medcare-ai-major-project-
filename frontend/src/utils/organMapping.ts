export type OrganId = 
  | 'liver' 
  | 'kidneys' 
  | 'heart' 
  | 'lungs' 
  | 'pancreas' 
  | 'blood' 
  | 'brain' 
  | 'stomach' 
  | 'intestines';

export type OrganSystemType = 
  | 'circulatory' 
  | 'hepatic' 
  | 'renal' 
  | 'pulmonary' 
  | 'endocrine' 
  | 'cardiovascular' 
  | 'nervous' 
  | 'digestive' 
  | 'skeletal';

export interface OrganFinding {
  organId: OrganId;
  organName: string;
  systemName: string;
  system: OrganSystemType;
  severity: 'NORMAL' | 'BORDERLINE' | 'ATTENTION' | 'CRITICAL';
  statusColor: string; // Hex color for 3D shader heatmap
  pulseSpeed: number;
  position3D: [number, number, number]; // [x, y, z] target in 3D scene
  cameraTarget: [number, number, number]; // [x, y, z] optimal camera view
  biomarkers: Array<{
    name: string;
    value: string | number;
    unit?: string;
    status: 'normal' | 'borderline' | 'attention' | 'critical';
    referenceRange?: string;
    explanation?: string;
  }>;
  primaryDiagnosis?: string;
  findingsSummary: string;
  clinicalAction: string;
  icon: string;
}

export interface OrganMetadata {
  id: OrganId;
  name: string;
  systemName: string;
  system: OrganSystemType;
  position3D: [number, number, number];
  cameraTarget: [number, number, number];
  icon: string;
  defaultDescription: string;
}

export const ORGAN_CATALOG: Record<OrganId, OrganMetadata> = {
  liver: {
    id: 'liver',
    name: 'Liver (Hepatic System)',
    systemName: 'Digestive & Metabolic',
    system: 'hepatic',
    position3D: [0.35, 0.45, 0.2],
    cameraTarget: [1.2, 0.6, 2.0],
    icon: '🫀',
    defaultDescription: 'Primary metabolic and detoxification organ, synthesizing proteins and filtering blood.',
  },
  kidneys: {
    id: 'kidneys',
    name: 'Kidneys (Renal System)',
    systemName: 'Renal & Urinary',
    system: 'renal',
    position3D: [-0.3, 0.2, -0.15],
    cameraTarget: [-1.2, 0.3, 2.2],
    icon: '🫘',
    defaultDescription: 'Filters waste, electrolytes, and excess fluid from blood to form urine.',
  },
  heart: {
    id: 'heart',
    name: 'Heart (Cardiovascular System)',
    systemName: 'Cardiovascular',
    system: 'cardiovascular',
    position3D: [0.08, 0.95, 0.25],
    cameraTarget: [0.6, 1.1, 1.8],
    icon: '❤️',
    defaultDescription: 'Central muscular pump circulating oxygenated blood throughout the body.',
  },
  lungs: {
    id: 'lungs',
    name: 'Lungs (Respiratory System)',
    systemName: 'Respiratory & Pulmonary',
    system: 'pulmonary',
    position3D: [-0.05, 1.05, 0.15],
    cameraTarget: [0.0, 1.2, 2.2],
    icon: '🫁',
    defaultDescription: 'Facilitates gas exchange, oxygenating blood and expelling carbon dioxide.',
  },
  pancreas: {
    id: 'pancreas',
    name: 'Pancreas (Endocrine System)',
    systemName: 'Endocrine & Metabolic',
    system: 'endocrine',
    position3D: [-0.1, 0.35, 0.1],
    cameraTarget: [-0.6, 0.5, 2.0],
    icon: '🥞',
    defaultDescription: 'Regulates glucose metabolism via insulin/glucagon and secretes digestive enzymes.',
  },
  blood: {
    id: 'blood',
    name: 'Circulatory & Blood (Hematology)',
    systemName: 'Circulatory & Hematology',
    system: 'circulatory',
    position3D: [0.0, 0.0, 0.3],
    cameraTarget: [0.0, 0.4, 3.2],
    icon: '🩸',
    defaultDescription: 'Blood cells, hemoglobin, platelets, and vascular transport network.',
  },
  brain: {
    id: 'brain',
    name: 'Brain (Nervous System)',
    systemName: 'Central Nervous System',
    system: 'nervous',
    position3D: [0.0, 1.9, 0.0],
    cameraTarget: [0.0, 2.0, 1.6],
    icon: '🧠',
    defaultDescription: 'Central command center governing cognition, motor control, and physiological homeostasis.',
  },
  stomach: {
    id: 'stomach',
    name: 'Stomach (Upper GI)',
    systemName: 'Digestive',
    system: 'digestive',
    position3D: [0.2, 0.6, 0.2],
    cameraTarget: [0.8, 0.7, 2.0],
    icon: '🥣',
    defaultDescription: 'Breaks down ingested food via hydrochloric acid and enzymes.',
  },
  intestines: {
    id: 'intestines',
    name: 'Intestines (Lower GI)',
    systemName: 'Digestive',
    system: 'digestive',
    position3D: [0.0, -0.05, 0.25],
    cameraTarget: [0.0, 0.1, 2.2],
    icon: '🧬',
    defaultDescription: 'Absorbs essential nutrients, vitamins, and water.',
  },
};

export const SEVERITY_COLORS = {
  NORMAL: '#10B981',     // Emerald Green
  BORDERLINE: '#F59E0B', // Amber
  ATTENTION: '#EF4444',  // Coral Red
  CRITICAL: '#DC2626',   // Crimson Red
};

/**
 * Maps raw biomarker metrics & extracted lab findings into structured 3D organ localized findings.
 */
export function mapBiomarkersToOrgans(
  rawBiomarkers: Array<{
    name: string;
    value: number | string;
    unit?: string;
    status: 'normal' | 'borderline' | 'attention' | string;
    explanation?: string;
    action?: string;
    min?: number;
    max?: number;
  }>,
  diagnosisText?: string
): OrganFinding[] {
  const organGroups: Record<OrganId, OrganFinding> = {} as any;

  // Helper to initialize organ finding
  const getOrCreateFinding = (organId: OrganId): OrganFinding => {
    if (!organGroups[organId]) {
      const meta = ORGAN_CATALOG[organId];
      organGroups[organId] = {
        organId,
        organName: meta.name,
        systemName: meta.systemName,
        system: meta.system,
        severity: 'NORMAL',
        statusColor: SEVERITY_COLORS.NORMAL,
        pulseSpeed: 1.0,
        position3D: meta.position3D,
        cameraTarget: meta.cameraTarget,
        biomarkers: [],
        findingsSummary: meta.defaultDescription,
        clinicalAction: 'Routine monitoring recommended.',
        icon: meta.icon,
      };
    }
    return organGroups[organId];
  };

  const getOrganForMetric = (name: string): OrganId => {
    const n = name.toLowerCase();

    // Hepatic / Liver
    if (
      n.includes('alt') ||
      n.includes('ast') ||
      n.includes('sgpt') ||
      n.includes('sgot') ||
      n.includes('bilirubin') ||
      n.includes('alp') ||
      n.includes('ggt') ||
      n.includes('albumin') ||
      n.includes('liver') ||
      n.includes('hepatic')
    ) {
      return 'liver';
    }

    // Renal / Kidneys
    if (
      n.includes('creatinine') ||
      n.includes('bun') ||
      n.includes('urea') ||
      n.includes('uric') ||
      n.includes('egfr') ||
      n.includes('kidney') ||
      n.includes('renal') ||
      n.includes('microalbumin')
    ) {
      return 'kidneys';
    }

    // Cardiovascular / Heart
    if (
      n.includes('pressure') ||
      n.includes('systolic') ||
      n.includes('diastolic') ||
      n.includes('heart') ||
      n.includes('pulse') ||
      n.includes('troponin') ||
      n.includes('cholesterol') ||
      n.includes('triglyceride') ||
      n.includes('ldl') ||
      n.includes('hdl') ||
      n.includes('cardiac')
    ) {
      return 'heart';
    }

    // Pulmonary / Lungs
    if (
      n.includes('oxygen') ||
      n.includes('spo2') ||
      n.includes('respiratory') ||
      n.includes('lung') ||
      n.includes('breath') ||
      n.includes('chest')
    ) {
      return 'lungs';
    }

    // Endocrine / Pancreas
    if (
      n.includes('glucose') ||
      n.includes('sugar') ||
      n.includes('hba1c') ||
      n.includes('insulin') ||
      n.includes('amylase') ||
      n.includes('lipase') ||
      n.includes('pancreas') ||
      n.includes('diabet')
    ) {
      return 'pancreas';
    }

    // Hematology / Blood
    if (
      n.includes('hemoglobin') ||
      n.includes('rbc') ||
      n.includes('wbc') ||
      n.includes('platelet') ||
      n.includes('mcv') ||
      n.includes('mch') ||
      n.includes('hematocrit') ||
      n.includes('esr') ||
      n.includes('cbc') ||
      n.includes('anemia') ||
      n.includes('iron') ||
      n.includes('ferritin')
    ) {
      return 'blood';
    }

    // Nervous / Brain
    if (
      n.includes('brain') ||
      n.includes('neuro') ||
      n.includes('head') ||
      n.includes('cognitive') ||
      n.includes('stroke')
    ) {
      return 'brain';
    }

    // GI / Digestion
    if (n.includes('stomach') || n.includes('gastric') || n.includes('acid')) {
      return 'stomach';
    }
    if (n.includes('bowel') || n.includes('colon') || n.includes('intestin')) {
      return 'intestines';
    }

    // Default to blood/circulatory for generic lab tests
    return 'blood';
  };

  // Process all extracted metrics
  for (const item of rawBiomarkers) {
    const organId = getOrganForMetric(item.name);
    const organ = getOrCreateFinding(organId);

    const statusClean = (item.status || 'normal').toLowerCase() as 'normal' | 'borderline' | 'attention' | 'critical';
    const refStr = item.min !== undefined && item.max !== undefined ? `${item.min} – ${item.max} ${item.unit || ''}` : undefined;

    organ.biomarkers.push({
      name: item.name,
      value: item.value,
      unit: item.unit,
      status: statusClean,
      referenceRange: refStr,
      explanation: item.explanation,
    });

    // Update organ overall severity (highest severity wins)
    if (statusClean === 'critical') {
      organ.severity = 'CRITICAL';
      organ.statusColor = SEVERITY_COLORS.CRITICAL;
      organ.pulseSpeed = 2.4;
    } else if (statusClean === 'attention' && organ.severity !== 'CRITICAL') {
      organ.severity = 'ATTENTION';
      organ.statusColor = SEVERITY_COLORS.ATTENTION;
      organ.pulseSpeed = 1.8;
    } else if (statusClean === 'borderline' && organ.severity === 'NORMAL') {
      organ.severity = 'BORDERLINE';
      organ.statusColor = SEVERITY_COLORS.BORDERLINE;
      organ.pulseSpeed = 1.3;
    }

    if (item.action && (!organ.clinicalAction || organ.clinicalAction === 'Routine monitoring recommended.')) {
      organ.clinicalAction = item.action;
    }
  }

  // Synthesize findings summaries for organs with abnormal metrics
  for (const organ of Object.values(organGroups)) {
    const abnormal = organ.biomarkers.filter(b => b.status !== 'normal');
    if (abnormal.length > 0) {
      const summaryList = abnormal.map(b => `${b.name} (${b.value} ${b.unit || ''})`).join(', ');
      organ.findingsSummary = `${abnormal.length} abnormal metric(s) detected: ${summaryList}.`;
    }
  }

  // If a global diagnosis mentions specific organs, tag them
  if (diagnosisText) {
    const dt = diagnosisText.toLowerCase();
    if (dt.includes('liver') || dt.includes('hepat') || dt.includes('fatty')) {
      const o = getOrCreateFinding('liver');
      o.primaryDiagnosis = diagnosisText;
      if (o.severity === 'NORMAL') {
        o.severity = 'BORDERLINE';
        o.statusColor = SEVERITY_COLORS.BORDERLINE;
      }
    }
    if (dt.includes('renal') || dt.includes('kidney') || dt.includes('nephro')) {
      const o = getOrCreateFinding('kidneys');
      o.primaryDiagnosis = diagnosisText;
      if (o.severity === 'NORMAL') {
        o.severity = 'BORDERLINE';
        o.statusColor = SEVERITY_COLORS.BORDERLINE;
      }
    }
    if (dt.includes('cardiac') || dt.includes('heart') || dt.includes('hypertens')) {
      const o = getOrCreateFinding('heart');
      o.primaryDiagnosis = diagnosisText;
      if (o.severity === 'NORMAL') {
        o.severity = 'BORDERLINE';
        o.statusColor = SEVERITY_COLORS.BORDERLINE;
      }
    }
  }

  // Return list sorted by severity (CRITICAL > ATTENTION > BORDERLINE > NORMAL)
  const severityRank = { CRITICAL: 4, ATTENTION: 3, BORDERLINE: 2, NORMAL: 1 };
  return Object.values(organGroups).sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}
