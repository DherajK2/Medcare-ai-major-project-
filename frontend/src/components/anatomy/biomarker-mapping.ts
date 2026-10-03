/**
 * Biomarker to Human Atlas Anatomy Mapping Layer
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. DETERMINISTIC MAPPING FOR ANATOMY:
 *    Biomarker -> Normalization -> BIOMARKER_MAPPING -> FMA Concept IDs -> 3D Atlas Mesh Parts.
 * 2. The LLM MUST NOT determine or guess 3D anatomy mappings.
 * 3. All concept IDs are verified against public/models/atlas.json (BodyParts3D dataset).
 * 4. Multi-organ biomarkers are supported (e.g. Glucose -> Pancreas & Liver).
 * 5. Unknown / unmapped biomarkers are handled safely without guessing.
 */

import type { Atlas, Concept } from './anatomy';

export interface BiomarkerData {
  biomarker: string;
  value: number | string;
  unit?: string;
  referenceRange?: string;
  status?: 'normal' | 'high' | 'low' | 'critical' | 'abnormal' | string;
  notes?: string;
}

export interface BiomarkerDefinition {
  name: string;
  organ: string;
  organs?: string[];
  conceptIds: string[];
  clinicalCategory: string;
  description: string;
  aliases: string[];
}

export interface BiomarkerMappingSuccess {
  mapped: true;
  key: string;
  name: string;
  organ: string;
  organs: string[];
  conceptIds: string[];
  clinicalCategory: string;
  description: string;
}

export interface BiomarkerMappingFailure {
  mapped: false;
  key: string;
  reason: string;
  suggestedAction?: string;
}

export type BiomarkerMappingResult = BiomarkerMappingSuccess | BiomarkerMappingFailure;

/**
 * Deterministic database of clinical laboratory biomarkers mapped to verified FMA concepts in atlas.json
 */
export const BIOMARKER_MAPPING: Record<string, BiomarkerDefinition> = {
  // ==========================================
  // RENAL / KIDNEY FUNCTION
  // ==========================================
  creatinine: {
    name: "Serum Creatinine",
    organ: "Kidney",
    organs: ["Kidney"],
    conceptIds: ["FMA7203", "FMA7204", "FMA7205"],
    clinicalCategory: "Renal Function",
    description: "Creatinine is a waste byproduct of muscle metabolism filtered out almost entirely by the glomeruli of the kidneys. Elevated levels indicate impaired glomerular filtration.",
    aliases: [
      "creatinine",
      "serum creatinine",
      "creatinine, serum",
      "s. creatinine",
      "s_creatinine",
      "creat",
      "cr",
      "serum_creatinine"
    ]
  },

  egfr: {
    name: "Estimated Glomerular Filtration Rate (eGFR)",
    organ: "Kidney",
    organs: ["Kidney"],
    conceptIds: ["FMA7203", "FMA7204", "FMA7205"],
    clinicalCategory: "Renal Function",
    description: "eGFR estimates how efficiently the kidneys filter blood per minute based on serum creatinine, age, and biological sex. Decreased values signify renal insufficiency or chronic kidney disease.",
    aliases: [
      "egfr",
      "estimated gfr",
      "estimated glomerular filtration rate",
      "gfr",
      "gfr (ckd-epi)",
      "egfr (ckd-epi)",
      "egfr_mdrd"
    ]
  },

  urea: {
    name: "Blood Urea / Blood Urea Nitrogen (BUN)",
    organ: "Kidney",
    organs: ["Kidney"],
    conceptIds: ["FMA7203", "FMA7204", "FMA7205"],
    clinicalCategory: "Renal Function",
    description: "Urea is the primary nitrogenous end product of protein catabolism, excreted by the kidneys. High levels (uremia/azotemia) reflect impaired renal clearance or dehydration.",
    aliases: [
      "urea",
      "blood urea",
      "bun",
      "blood urea nitrogen",
      "serum urea",
      "urea nitrogen",
      "s. urea",
      "serum_urea",
      "blood urea nitrogen (bun)"
    ]
  },

  uric_acid: {
    name: "Serum Uric Acid",
    organ: "Kidney",
    organs: ["Kidney"],
    conceptIds: ["FMA7203", "FMA7204", "FMA7205"],
    clinicalCategory: "Renal Function",
    description: "Uric acid is generated from the breakdown of purines and excreted by renal tubules. Hyperuricemia can lead to nephrolithiasis (kidney stones) or gout.",
    aliases: [
      "uric acid",
      "serum uric acid",
      "urate",
      "s. uric acid",
      "uric_acid"
    ]
  },

  cystatin_c: {
    name: "Cystatin C",
    organ: "Kidney",
    organs: ["Kidney"],
    conceptIds: ["FMA7203", "FMA7204", "FMA7205"],
    clinicalCategory: "Renal Function",
    description: "Cystatin C is a low-molecular-weight protein filtered freely by renal glomeruli and reabsorbed by proximal tubules, serving as a sensitive indicator of kidney function.",
    aliases: [
      "cystatin c",
      "cystatin-c",
      "serum cystatin c",
      "cysc"
    ]
  },

  microalbumin: {
    name: "Urine Microalbumin",
    organ: "Kidney",
    organs: ["Kidney"],
    conceptIds: ["FMA7203", "FMA7204", "FMA7205"],
    clinicalCategory: "Renal Function",
    description: "Detects tiny amounts of albumin in urine, representing early glomerular capillary leakage and nephropathy.",
    aliases: [
      "microalbumin",
      "urine microalbumin",
      "microalbuminuria",
      "uacr",
      "albumin creatinine ratio"
    ]
  },

  // ==========================================
  // HEPATIC / LIVER FUNCTION (LFT)
  // ==========================================
  alt: {
    name: "Alanine Aminotransferase (ALT / SGPT)",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "ALT is an enzyme concentrated in hepatocytes. Release into the bloodstream serves as a highly specific biomarker for hepatocellular injury, hepatitis, or hepatic necrosis.",
    aliases: [
      "alt",
      "alanine aminotransferase",
      "sgpt",
      "serum glutamic pyruvic transaminase",
      "alanine transaminase",
      "alt (sgpt)",
      "s. alt",
      "s_alt"
    ]
  },

  ast: {
    name: "Aspartate Aminotransferase (AST / SGOT)",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "AST is found in liver parenchyma as well as cardiac and skeletal muscle. Elevated AST with ALT characterizes acute or chronic liver disease, toxic hepatitis, and cirrhosis.",
    aliases: [
      "ast",
      "aspartate aminotransferase",
      "sgot",
      "serum glutamic oxaloacetic transaminase",
      "aspartate transaminase",
      "ast (sgot)",
      "s. ast",
      "s_ast"
    ]
  },

  bilirubin: {
    name: "Total Bilirubin",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "Bilirubin is formed from hemoglobin breakdown and processed by hepatocytes before excretion in bile. Hyperbilirubinemia causes jaundice and indicates biliary obstruction or hepatic dysfunction.",
    aliases: [
      "bilirubin",
      "total bilirubin",
      "bilirubin, total",
      "t. bilirubin",
      "t_bili",
      "serum bilirubin",
      "direct bilirubin",
      "conjugated bilirubin",
      "indirect bilirubin",
      "unconjugated bilirubin"
    ]
  },

  alp: {
    name: "Alkaline Phosphatase (ALP)",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "Alkaline phosphatase is concentrated in hepatic biliary canaliculi. Markedly elevated ALP is a classic marker for cholestasis, biliary duct obstruction, and infiltrative liver conditions.",
    aliases: [
      "alp",
      "alkaline phosphatase",
      "alk phos",
      "s. alp",
      "serum alkaline phosphatase"
    ]
  },

  ggt: {
    name: "Gamma-Glutamyl Transferase (GGT)",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "GGT is a microsomal enzyme in hepatobiliary epithelial cells. It provides high sensitivity for biliary tract disease and alcohol-induced hepatotoxicity.",
    aliases: [
      "ggt",
      "gamma gt",
      "gamma-glutamyl transferase",
      "gamma-glutamyl transpeptidase",
      "ggtp"
    ]
  },

  albumin: {
    name: "Serum Albumin",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "Albumin is synthesized exclusively by the liver and maintains intravascular oncotic pressure. Hypoalbuminemia reflects impaired hepatic synthetic capacity or chronic liver failure.",
    aliases: [
      "albumin",
      "serum albumin",
      "s. albumin",
      "s_albumin"
    ]
  },

  total_protein: {
    name: "Total Protein",
    organ: "Liver",
    organs: ["Liver"],
    conceptIds: ["FMA7197"],
    clinicalCategory: "Hepatic Panel",
    description: "Measures total serum protein, predominantly albumin and globulins synthesized by the liver and lymphoid tissue.",
    aliases: [
      "total protein",
      "serum total protein",
      "tp",
      "protein, total"
    ]
  },

  // ==========================================
  // CARDIAC BIOMARKERS
  // ==========================================
  troponin: {
    name: "Cardiac Troponin (cTnI / cTnT)",
    organ: "Heart",
    organs: ["Heart"],
    conceptIds: ["FMA7088"],
    clinicalCategory: "Cardiac Markers",
    description: "Troponins I and T are regulatory proteins specific to the cardiac myocardium. Elevated troponin is the gold standard diagnostic biomarker for myocardial infarction and acute coronary syndromes.",
    aliases: [
      "troponin",
      "troponin i",
      "troponin t",
      "hs-ctni",
      "hs-ctnt",
      "cardiac troponin",
      "high sensitivity troponin",
      "high-sensitivity troponin",
      "high sensitivity troponin i",
      "high-sensitivity troponin i",
      "high sensitivity troponin t",
      "high-sensitivity troponin t",
      "trop i",
      "trop t",
      "ctni",
      "ctnt",
      "troponin i (hs-ctni)"
    ]
  },

  ck_mb: {
    name: "Creatine Kinase-MB (CK-MB)",
    organ: "Heart",
    organs: ["Heart"],
    conceptIds: ["FMA7088"],
    clinicalCategory: "Cardiac Markers",
    description: "CK-MB is an isoenzyme of creatine kinase concentrated in cardiac tissue. It rises rapidly following myocardial necrosis and is used to assess acute myocardial injury.",
    aliases: [
      "ck_mb",
      "ck-mb",
      "ck mb",
      "creatine kinase mb",
      "creatine kinase-myocardial band",
      "ckmb"
    ]
  },

  bnp: {
    name: "B-Type Natriuretic Peptide (BNP / NT-proBNP)",
    organ: "Heart",
    organs: ["Heart"],
    conceptIds: ["FMA7088"],
    clinicalCategory: "Cardiac Markers",
    description: "BNP and NT-proBNP are neurohormones released by ventricular cardiomyocytes in response to myocardial stretch and increased intracardiac pressure, serving as key markers for heart failure.",
    aliases: [
      "bnp",
      "brain natriuretic peptide",
      "nt_probnp",
      "nt-probnp",
      "nt probnp",
      "pro-bnp",
      "probnp",
      "b-type natriuretic peptide"
    ]
  },

  myoglobin: {
    name: "Myoglobin",
    organ: "Heart",
    organs: ["Heart"],
    conceptIds: ["FMA7088"],
    clinicalCategory: "Cardiac Markers",
    description: "An oxygen-binding heme protein present in cardiac and skeletal muscle released into circulation very early after myocardial injury.",
    aliases: [
      "myoglobin",
      "serum myoglobin"
    ]
  },

  // ==========================================
  // PANCREATIC BIOMARKERS
  // ==========================================
  amylase: {
    name: "Serum Amylase",
    organ: "Pancreas",
    organs: ["Pancreas"],
    conceptIds: ["FMA7198"],
    clinicalCategory: "Pancreatic Enzymes",
    description: "Amylase is a digestive enzyme secreted by pancreatic acinar cells. Marked elevations are indicative of acute pancreatitis or pancreatic duct obstruction.",
    aliases: [
      "amylase",
      "serum amylase",
      "s. amylase",
      "pancreatic amylase"
    ]
  },

  lipase: {
    name: "Serum Lipase",
    organ: "Pancreas",
    organs: ["Pancreas"],
    conceptIds: ["FMA7198"],
    clinicalCategory: "Pancreatic Enzymes",
    description: "Lipase hydrolyzes dietary triglycerides and is highly specific to pancreatic tissue. It remains elevated longer than amylase in acute pancreatitis.",
    aliases: [
      "lipase",
      "serum lipase",
      "s. lipase",
      "pancreatic lipase"
    ]
  },

  c_peptide: {
    name: "C-Peptide",
    organ: "Pancreas",
    organs: ["Pancreas"],
    conceptIds: ["FMA7198"],
    clinicalCategory: "Pancreatic Endocrine",
    description: "C-peptide is cleaved from proinsulin in pancreatic beta cells. It provides a direct measure of endogenous insulin secretion.",
    aliases: [
      "c-peptide",
      "c peptide",
      "connecting peptide",
      "serum c-peptide"
    ]
  },

  insulin: {
    name: "Serum Insulin",
    organ: "Pancreas",
    organs: ["Pancreas"],
    conceptIds: ["FMA7198"],
    clinicalCategory: "Pancreatic Endocrine",
    description: "Hormone secreted by pancreatic beta cells of the Islets of Langerhans, regulating carbohydrate and lipid metabolism.",
    aliases: [
      "insulin",
      "serum insulin",
      "fasting insulin"
    ]
  },

  // ==========================================
  // MULTI-ORGAN METABOLIC BIOMARKERS
  // ==========================================
  glucose: {
    name: "Blood Glucose / Blood Sugar",
    organ: "Pancreas & Liver",
    organs: ["Pancreas", "Liver"],
    conceptIds: ["FMA7198", "FMA7197"],
    clinicalCategory: "Metabolic Panel",
    description: "Blood glucose regulation is orchestrated primarily by pancreatic insulin and glucagon secretion alongside hepatic gluconeogenesis and glycogenolysis. Dysregulation indicates diabetes mellitus or metabolic syndrome.",
    aliases: [
      "glucose",
      "blood glucose",
      "blood sugar",
      "fasting blood sugar",
      "fbs",
      "random blood sugar",
      "rbs",
      "fasting blood glucose",
      "fbg",
      "post prandial blood sugar",
      "ppbs",
      "serum glucose"
    ]
  },

  hba1c: {
    name: "Glycated Hemoglobin (HbA1c)",
    organ: "Pancreas & Liver",
    organs: ["Pancreas", "Liver"],
    conceptIds: ["FMA7198", "FMA7197"],
    clinicalCategory: "Metabolic Panel",
    description: "HbA1c reflects average blood glucose levels over the prior 2 to 3 months, reflecting long-term glycemic control governed by pancreatic endocrine output and hepatic glucose buffering.",
    aliases: [
      "hba1c",
      "glycated hemoglobin",
      "glycosylated hemoglobin",
      "a1c",
      "hemoglobin a1c"
    ]
  },

  ldh: {
    name: "Lactate Dehydrogenase (LDH)",
    organ: "Liver & Heart",
    organs: ["Liver", "Heart"],
    conceptIds: ["FMA7197", "FMA7088"],
    clinicalCategory: "Enzyme Markers",
    description: "LDH catalyzes the conversion of lactate to pyruvate, widely expressed in hepatic parenchyma and myocardial cells. Significant elevation indicates tissue breakdown or cellular damage.",
    aliases: [
      "ldh",
      "lactate dehydrogenase",
      "serum ldh",
      "lactic acid dehydrogenase"
    ]
  },

  // ==========================================
  // ENDOCRINE GLANDS (ADRENAL & PITUITARY)
  // ==========================================
  cortisol: {
    name: "Serum Cortisol",
    organ: "Adrenal Gland",
    organs: ["Adrenal Gland"],
    conceptIds: ["FMA9604"],
    clinicalCategory: "Adrenal Endocrine",
    description: "Glucocorticoid steroid hormone synthesized and secreted by the adrenal cortex in response to stress and low blood glucose.",
    aliases: [
      "cortisol",
      "serum cortisol",
      "hydrocortisone",
      "plasma cortisol"
    ]
  },

  aldosterone: {
    name: "Aldosterone",
    organ: "Adrenal Gland",
    organs: ["Adrenal Gland"],
    conceptIds: ["FMA9604"],
    clinicalCategory: "Adrenal Endocrine",
    description: "Mineralocorticoid hormone produced in the outer section of the adrenal cortex, regulating sodium and potassium homeostasis.",
    aliases: [
      "aldosterone",
      "serum aldosterone",
      "plasma aldosterone"
    ]
  },

  acth: {
    name: "Adrenocorticotropic Hormone (ACTH)",
    organ: "Pituitary Gland",
    organs: ["Pituitary Gland"],
    conceptIds: ["FMA13889"],
    clinicalCategory: "Pituitary Endocrine",
    description: "Polypeptide tropic hormone produced and secreted by the anterior pituitary gland that stimulates the adrenal cortex.",
    aliases: [
      "acth",
      "adrenocorticotropic hormone",
      "corticotropin",
      "plasma acth"
    ]
  },

  prolactin: {
    name: "Prolactin",
    organ: "Pituitary Gland",
    organs: ["Pituitary Gland"],
    conceptIds: ["FMA13889"],
    clinicalCategory: "Pituitary Endocrine",
    description: "Protein hormone produced by lactotroph cells in the anterior pituitary gland.",
    aliases: [
      "prolactin",
      "serum prolactin",
      "prl"
    ]
  },

  growth_hormone: {
    name: "Growth Hormone (GH)",
    organ: "Pituitary Gland",
    organs: ["Pituitary Gland"],
    conceptIds: ["FMA13889"],
    clinicalCategory: "Pituitary Endocrine",
    description: "Peptide hormone synthesized, stored, and secreted by somatotroph cells within the lateral wings of the anterior pituitary gland.",
    aliases: [
      "growth hormone",
      "gh",
      "somatotropin",
      "human growth hormone",
      "hgh"
    ]
  },

  // ==========================================
  // PULMONARY / RESPIRATORY
  // ==========================================
  arterial_blood_gas: {
    name: "Blood Gas (PaO2 / PaCO2)",
    organ: "Lungs",
    organs: ["Lungs"],
    conceptIds: ["FMA7309", "FMA7310"],
    clinicalCategory: "Pulmonary Blood Gas",
    description: "Measures oxygen and carbon dioxide tensions across alveolar-capillary membranes in pulmonary tissue.",
    aliases: [
      "abg",
      "arterial blood gas",
      "pao2",
      "paco2",
      "po2",
      "pco2",
      "spo2",
      "oxygen saturation"
    ]
  },

  // ==========================================
  // GASTROINTESTINAL & BILIARY
  // ==========================================
  gastrin: {
    name: "Serum Gastrin",
    organ: "Stomach",
    organs: ["Stomach"],
    conceptIds: ["FMA7148"],
    clinicalCategory: "Gastrointestinal",
    description: "Peptide hormone stimulated by G-cells in the pyloric antrum of the stomach that stimulates gastric acid secretion.",
    aliases: [
      "gastrin",
      "serum gastrin"
    ]
  },

  bile_acids: {
    name: "Total Bile Acids",
    organ: "Gallbladder",
    organs: ["Gallbladder"],
    conceptIds: ["FMA7202"],
    clinicalCategory: "Biliary System",
    description: "Steroid acids synthesized from cholesterol and stored/concentrated in the gallbladder before release into the duodenum.",
    aliases: [
      "bile acids",
      "total bile acids",
      "serum bile acids"
    ]
  }
};

/**
 * Explicit catalog of known biomarkers that lack discrete 3D organ representation
 * in this specific dataset (BodyParts3D subset), preventing any guesswork.
 */
export const UNMAPPED_BIOMARKERS: Record<string, { name: string; reason: string }> = {
  tsh: {
    name: "Thyroid Stimulating Hormone (TSH)",
    reason: "Thyroid gland is not modeled in this 3D BodyParts3D dataset scope."
  },
  t3: {
    name: "Triiodothyronine (T3)",
    reason: "Thyroid gland is not modeled in this 3D BodyParts3D dataset scope."
  },
  t4: {
    name: "Thyroxine (T4)",
    reason: "Thyroid gland is not modeled in this 3D BodyParts3D dataset scope."
  },
  free_t3: {
    name: "Free T3",
    reason: "Thyroid gland is not modeled in this 3D BodyParts3D dataset scope."
  },
  free_t4: {
    name: "Free T4",
    reason: "Thyroid gland is not modeled in this 3D BodyParts3D dataset scope."
  },
  anti_tpo: {
    name: "Anti-TPO Antibodies",
    reason: "Thyroid gland is not modeled in this 3D BodyParts3D dataset scope."
  },
  crp: {
    name: "C-Reactive Protein (CRP)",
    reason: "Systemic acute-phase inflammatory marker without single discrete organ localization."
  },
  esr: {
    name: "Erythrocyte Sedimentation Rate (ESR)",
    reason: "Non-specific hematological inflammatory indicator without single organ localization."
  },
  ferritin: {
    name: "Serum Ferritin",
    reason: "Systemic iron-storage protein circulating system-wide without single organ localization."
  },
  procalcitonin: {
    name: "Procalcitonin",
    reason: "Systemic bacterial infection biomarker produced throughout multiple body tissues."
  },
  hemoglobin: {
    name: "Hemoglobin (Hb)",
    reason: "Hematological oxygen-carrying protein circulating through the entire vascular system (Viewable in 3D Cellular Twin)."
  },
  platelets: {
    name: "Platelet Count",
    reason: "Circulating cellular blood component produced in bone marrow (Viewable in 3D Cellular Twin)."
  },
  wbc: {
    name: "White Blood Cell Count (WBC)",
    reason: "Circulating leukocyte immune cells distributed throughout the vascular and lymphatic systems (Viewable in 3D Cellular Twin)."
  }
};

export type CellularBiomarkerType = 
  | 'rbc' 
  | 'platelet' 
  | 'neutrophil' 
  | 'lymphocyte' 
  | 'monocyte' 
  | 'eosinophil' 
  | 'basophil' 
  | 'wbc_total';

export const CELLULAR_BIOMARKER_MAP: Record<string, CellularBiomarkerType> = {
  rbc: 'rbc',
  'red blood cell': 'rbc',
  'red blood cells': 'rbc',
  'erythrocyte': 'rbc',
  'erythrocytes': 'rbc',
  'hemoglobin': 'rbc',
  'hb': 'rbc',
  'hgb': 'rbc',
  'hematocrit': 'rbc',
  'hct': 'rbc',
  'packed cell volume': 'rbc',
  'pcv': 'rbc',
  'mcv': 'rbc',
  'mch': 'rbc',
  'mchc': 'rbc',
  'rdw': 'rbc',
  'platelet': 'platelet',
  'platelets': 'platelet',
  'platelet count': 'platelet',
  'plt': 'platelet',
  'thrombocyte': 'platelet',
  'thrombocytes': 'platelet',
  'mpv': 'platelet',
  'neutrophil': 'neutrophil',
  'neutrophils': 'neutrophil',
  'neutrophil count': 'neutrophil',
  'anc': 'neutrophil',
  'absolute neutrophil count': 'neutrophil',
  'polymorphs': 'neutrophil',
  'segmented neutrophils': 'neutrophil',
  'segs': 'neutrophil',
  'bands': 'neutrophil',
  'lymphocyte': 'lymphocyte',
  'lymphocytes': 'lymphocyte',
  'lymphocyte count': 'lymphocyte',
  'alc': 'lymphocyte',
  'absolute lymphocyte count': 'lymphocyte',
  'lymphs': 'lymphocyte',
  't cells': 'lymphocyte',
  'b cells': 'lymphocyte',
  'nk cells': 'lymphocyte',
  'monocyte': 'monocyte',
  'monocytes': 'monocyte',
  'monocyte count': 'monocyte',
  'amc': 'monocyte',
  'absolute monocyte count': 'monocyte',
  'monos': 'monocyte',
  'macrophages': 'monocyte',
  'eosinophil': 'eosinophil',
  'eosinophils': 'eosinophil',
  'eosinophil count': 'eosinophil',
  'aec': 'eosinophil',
  'absolute eosinophil count': 'eosinophil',
  'eos': 'eosinophil',
  'basophil': 'basophil',
  'basophils': 'basophil',
  'basophil count': 'basophil',
  'abc': 'basophil',
  'absolute basophil count': 'basophil',
  'basos': 'basophil',
  'wbc': 'wbc_total',
  'white blood cell': 'wbc_total',
  'white blood cells': 'wbc_total',
  'total leukocyte count': 'wbc_total',
  'tlc': 'wbc_total',
  'leukocytes': 'wbc_total',
  'leukocyte count': 'wbc_total',
  'wbc count': 'wbc_total'
};

export function resolveCellularBiomarker(name: string): CellularBiomarkerType | null {
  if (!name || typeof name !== 'string') return null;
  const lower = name.toLowerCase().trim();
  if (CELLULAR_BIOMARKER_MAP[lower]) return CELLULAR_BIOMARKER_MAP[lower];
  const stripped = lower.replace(/[^a-z0-9]/g, '');
  if (CELLULAR_BIOMARKER_MAP[stripped]) return CELLULAR_BIOMARKER_MAP[stripped];
  for (const [key, val] of Object.entries(CELLULAR_BIOMARKER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

/**
 * Precomputed alias lookup map for high-speed O(1) alias matching
 */
const ALIAS_LOOKUP: Map<string, string> = new Map();

function registerAlias(rawAlias: string, targetKey: string) {
  const lower = rawAlias.toLowerCase().trim();
  if (!lower) return;
  ALIAS_LOOKUP.set(lower, targetKey);
  const stripped = lower.replace(/[^a-z0-9]/g, '');
  if (stripped) {
    ALIAS_LOOKUP.set(stripped, targetKey);
  }
}

for (const [key, def] of Object.entries(BIOMARKER_MAPPING)) {
  registerAlias(key, key);
  registerAlias(def.name, key);
  for (const alias of def.aliases) {
    registerAlias(alias, key);
  }
}

for (const [key, unmapped] of Object.entries(UNMAPPED_BIOMARKERS)) {
  registerAlias(key, `unmapped:${key}`);
  registerAlias(unmapped.name, `unmapped:${key}`);
}

/**
 * Deterministically normalize any raw biomarker string by stripping clinical suffixes,
 * noise words, punctuation, and matching against verified alias tables.
 */
export function normalizeBiomarkerName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  const rawLower = name.trim().toLowerCase();

  // 1. Direct match
  if (ALIAS_LOOKUP.has(rawLower)) {
    return ALIAS_LOOKUP.get(rawLower)!;
  }

  // 2. Check content inside parentheses, e.g. "ALT (SGPT)" -> "sgpt", "Blood Urea Nitrogen (BUN)" -> "bun"
  const parenMatch = rawLower.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].trim().toLowerCase();
    const strippedInside = inside.replace(/[^a-z0-9]/g, '');
    if (ALIAS_LOOKUP.has(inside)) return ALIAS_LOOKUP.get(inside)!;
    if (ALIAS_LOOKUP.has(strippedInside)) return ALIAS_LOOKUP.get(strippedInside)!;
  }

  // 3. Check outside parentheses, e.g. "Blood Urea Nitrogen (BUN)" -> "blood urea nitrogen"
  const outsideParen = rawLower.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (ALIAS_LOOKUP.has(outsideParen)) return ALIAS_LOOKUP.get(outsideParen)!;

  // 4. Strip clinical noise words (serum, blood, total, level, test, high sensitivity, etc.)
  const strippedNoise = rawLower
    .replace(/\b(high[- ]sensitivity|hs[- ]|s\.|s_|t\.|t_|serum|plasma|blood|total|level|test|fasting|random|post[- ]?prandial|estimated)\b/gi, ' ')
    .replace(/[,\(\)\/_\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (ALIAS_LOOKUP.has(strippedNoise)) return ALIAS_LOOKUP.get(strippedNoise)!;
  const alpha = strippedNoise.replace(/[^a-z0-9]/g, '');
  if (ALIAS_LOOKUP.has(alpha)) return ALIAS_LOOKUP.get(alpha)!;

  // 5. Check known unmapped keys
  const unmappedKey = Object.keys(UNMAPPED_BIOMARKERS).find(
    k => k === rawLower || k === alpha || UNMAPPED_BIOMARKERS[k].name.toLowerCase() === rawLower
  );
  if (unmappedKey) {
    return `unmapped:${unmappedKey}`;
  }

  return rawLower;
}

/**
 * Deterministically resolve a biomarker name to its verified Human Atlas concept IDs.
 * Strictly guarantees NO LLM GUESSWORK.
 */
export function getBiomarkerMapping(name: string): BiomarkerMappingResult {
  if (!name || !name.trim()) {
    return {
      mapped: false,
      key: '',
      reason: "No biomarker name provided."
    };
  }

  const normalizedKey = normalizeBiomarkerName(name);

  // Check if it's in the explicit unmapped catalog
  if (normalizedKey.startsWith('unmapped:')) {
    const rawKey = normalizedKey.replace('unmapped:', '');
    const item = UNMAPPED_BIOMARKERS[rawKey];
    return {
      mapped: false,
      key: rawKey,
      reason: item ? item.reason : "Anatomical mapping unavailable for this parameter in this 3D atlas."
    };
  }

  if (UNMAPPED_BIOMARKERS[normalizedKey]) {
    return {
      mapped: false,
      key: normalizedKey,
      reason: UNMAPPED_BIOMARKERS[normalizedKey].reason
    };
  }

  // Check verified mapping database
  const def = BIOMARKER_MAPPING[normalizedKey];
  if (def) {
    return {
      mapped: true,
      key: normalizedKey,
      name: def.name,
      organ: def.organ,
      organs: def.organs ?? [def.organ],
      conceptIds: [...def.conceptIds],
      clinicalCategory: def.clinicalCategory,
      description: def.description
    };
  }

  // Not found in verified database -> DO NOT GUESS.
  return {
    mapped: false,
    key: normalizedKey,
    reason: `No verified anatomy mapping available for biomarker "${name}".`
  };
}

/**
 * High-level bridge helper to resolve a biomarker name to matching 3D Atlas mesh part IDs.
 */
export function resolveBiomarkerToElements(
  atlas: Atlas,
  biomarkerName: string
): {
  mapping: BiomarkerMappingResult;
  elements: string[];
  concepts: Concept[];
  primaryConceptName: string;
} {
  const mapping = getBiomarkerMapping(biomarkerName);
  if (!mapping.mapped) {
    return {
      mapping,
      elements: [],
      concepts: [],
      primaryConceptName: '',
    };
  }

  const elementsSet = new Set<string>();
  const matchedConcepts: Concept[] = [];

  for (const cid of mapping.conceptIds) {
    const c = atlas.concepts.find(item => item.id.toUpperCase() === cid.toUpperCase());
    if (c) {
      matchedConcepts.push(c);
      for (const el of c.elements) {
        elementsSet.add(el);
      }
    }
  }

  // Fallback: If any part in atlas.parts matches the conceptId directly
  if (elementsSet.size === 0) {
    for (const cid of mapping.conceptIds) {
      for (const p of atlas.parts) {
        if (p.conceptId.toUpperCase() === cid.toUpperCase()) {
          elementsSet.add(p.id);
        }
      }
    }
  }

  const elements = Array.from(elementsSet);
  const primaryConceptName = Array.isArray(mapping.organ)
    ? mapping.organ.join(' & ')
    : mapping.organ;

  return {
    mapping,
    elements,
    concepts: matchedConcepts,
    primaryConceptName,
  };
}

/**
 * Sample test suite representing real clinical laboratory reports for immediate acceptance testing
 */
export const SAMPLE_REPORT_BIOMARKERS: BiomarkerData[] = [
  {
    biomarker: "Serum Creatinine",
    value: 1.8,
    unit: "mg/dL",
    referenceRange: "0.7 - 1.3",
    status: "high",
    notes: "Indicates impaired renal glomerular filtration"
  },
  {
    biomarker: "eGFR",
    value: 42,
    unit: "mL/min/1.73m²",
    referenceRange: "> 90",
    status: "low",
    notes: "Stage 3a Chronic Kidney Disease indicator"
  },
  {
    biomarker: "Blood Urea Nitrogen (BUN)",
    value: 38,
    unit: "mg/dL",
    referenceRange: "7 - 20",
    status: "high",
    notes: "Elevated nitrogenous waste clearance"
  },
  {
    biomarker: "ALT (SGPT)",
    value: 85,
    unit: "U/L",
    referenceRange: "7 - 56",
    status: "high",
    notes: "Hepatocellular enzyme elevation"
  },
  {
    biomarker: "AST (SGOT)",
    value: 92,
    unit: "U/L",
    referenceRange: "10 - 40",
    status: "high",
    notes: "Hepatic / myocardial transaminase elevation"
  },
  {
    biomarker: "Total Bilirubin",
    value: 2.4,
    unit: "mg/dL",
    referenceRange: "0.2 - 1.2",
    status: "high",
    notes: "Hepatic conjugate excretion impairment"
  },
  {
    biomarker: "High-Sensitivity Troponin I",
    value: 0.45,
    unit: "ng/mL",
    referenceRange: "< 0.04",
    status: "critical",
    notes: "Acute myocardial necrosis biomarker"
  },
  {
    biomarker: "CK-MB",
    value: 28,
    unit: "ng/mL",
    referenceRange: "< 5.0",
    status: "high",
    notes: "Cardiomyocyte band elevation"
  },
  {
    biomarker: "Fasting Blood Sugar (FBS)",
    value: 245,
    unit: "mg/dL",
    referenceRange: "70 - 99",
    status: "high",
    notes: "Hyperglycemia - endocrine pancreas & liver regulation"
  },
  {
    biomarker: "Serum Amylase",
    value: 195,
    unit: "U/L",
    referenceRange: "30 - 110",
    status: "high",
    notes: "Pancreatic enzyme elevation"
  },
  {
    biomarker: "Alkaline Phosphatase (ALP)",
    value: 215,
    unit: "U/L",
    referenceRange: "44 - 147",
    status: "high",
    notes: "Biliary / hepatic cholestatic marker"
  },
  {
    biomarker: "Thyroid Stimulating Hormone (TSH)",
    value: 8.5,
    unit: "mIU/L",
    referenceRange: "0.4 - 4.0",
    status: "high",
    notes: "Thyroid marker (Unmapped in 3D atlas)"
  },
  {
    biomarker: "C-Reactive Protein (CRP)",
    value: 48,
    unit: "mg/L",
    referenceRange: "< 3.0",
    status: "high",
    notes: "Systemic inflammatory marker (Unmapped)"
  }
];