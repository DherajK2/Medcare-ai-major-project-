import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type CellTypeId = 
  | 'rbc' 
  | 'platelet' 
  | 'neutrophil' 
  | 'lymphocyte' 
  | 'monocyte' 
  | 'eosinophil' 
  | 'basophil'
  | 'wbc_total';

export interface CellModelConfig {
  id: CellTypeId;
  name: string;
  scientificName: string;
  category: 'Erythrocyte' | 'Thrombocyte' | 'Granulocyte' | 'Agranulocyte' | 'Total Leukocytes';
  membraneColor: string;
  nucleusColor?: string;
  modelPath: string;
  nucleusPath?: string;
  isWbc: boolean;
  diameter: string;
  lifespan: string;
  normalRange: string;
  differentialPct?: string;
  description: string;
  morphology: string;
  clinicalFunction: string;
  causesHigh: string[];
  causesLow: string[];
}

export const CELL_DEFINITIONS: Record<CellTypeId, CellModelConfig> = {
  rbc: {
    id: 'rbc',
    name: 'Red Blood Cell (RBC)',
    scientificName: 'Erythrocyte',
    category: 'Erythrocyte',
    membraneColor: '#dc2626',
    modelPath: '/models/cells/rbc.glb',
    isWbc: false,
    diameter: '7.5 – 8.7 µm',
    lifespan: '100 – 120 days',
    normalRange: '4.5 – 5.9 M/µL (M) / 4.1 – 5.1 M/µL (F)',
    description: 'Anucleated biconcave discs loaded with hemoglobin protein molecules designed for maximum surface-area-to-volume ratio during gas exchange.',
    morphology: 'Biconcave disc with a thin central pallor area, highly flexible to traverse capillary microcirculation (3-4 µm lumens).',
    clinicalFunction: 'Binds oxygen in pulmonary capillaries via iron-containing heme and delivers it to tissue mitochondria, while transporting metabolic CO₂ back to lungs.',
    causesHigh: [
      'Dehydration / hemoconcentration',
      'Chronic hypoxia (COPD, high altitude)',
      'Polycythemia vera (myeloproliferative neoplasm)',
      'Renal cell carcinoma (excess erythropoietin)'
    ],
    causesLow: [
      'Iron deficiency anemia',
      'Acute or chronic blood loss',
      'Aplastic anemia / bone marrow failure',
      'Hemolytic anemia (autoimmune, sickle cell, G6PD deficiency)'
    ]
  },
  platelet: {
    id: 'platelet',
    name: 'Platelet',
    scientificName: 'Thrombocyte',
    category: 'Thrombocyte',
    membraneColor: '#9333ea',
    modelPath: '/models/cells/platelet.glb',
    isWbc: false,
    diameter: '2.0 – 3.0 µm',
    lifespan: '7 – 10 days',
    normalRange: '150,000 – 450,000 /µL',
    description: 'Small disc-shaped anucleate cell fragments budded from megakaryocytes in the bone marrow, crucial for primary hemostasis and clot initiation.',
    morphology: 'Small cytoplasmic fragments with fine azurophilic granules, capable of rapid shape change with pseudopod extension upon collagen activation.',
    clinicalFunction: 'Adheres to exposed subendothelial von Willebrand factor, aggregates with fibrinogen to form a primary platelet plug, and releases clotting factors.',
    causesHigh: [
      'Reactive thrombocytosis (infection, post-splenectomy, trauma)',
      'Essential thrombocythemia (JAK2 mutation)',
      'Iron deficiency anemia',
      'Chronic inflammatory disorders (RA, IBD)'
    ],
    causesLow: [
      'Viral infections (Dengue, Epstein-Barr, HIV)',
      'Immune Thrombocytopenic Purpura (ITP)',
      'Splenic sequestration / hypersplenism',
      'Drug-induced (Heparin, chemo, antibiotics)'
    ]
  },
  neutrophil: {
    id: 'neutrophil',
    name: 'Neutrophil',
    scientificName: 'Neutrophilic Granulocyte',
    category: 'Granulocyte',
    membraneColor: '#0ea5e9',
    nucleusColor: '#6366f1',
    modelPath: '/models/cells/wbc_cytoplasm.glb',
    nucleusPath: '/models/cells/neutrophil_nucleus.glb',
    isWbc: true,
    diameter: '12 – 15 µm',
    lifespan: '6 – 10 hours in blood (days in tissue)',
    normalRange: '2,000 – 7,000 /µL (ANC)',
    differentialPct: '40% – 70% of total WBC',
    description: 'The most abundant circulating white blood cell and the primary first-responder to acute bacterial infection and tissue trauma.',
    morphology: 'Characteristic 3 to 5 lobed segmented nucleus connected by thin chromatin filaments with neutral pink-lilac primary & secondary granules.',
    clinicalFunction: 'Performs rapid chemotaxis, phagocytosis of opsonized bacteria, respiratory burst superoxide production, and release of Neutrophil Extracellular Traps (NETs).',
    causesHigh: [
      'Acute pyogenic bacterial infections (pneumonia, appendicitis, sepsis)',
      'Tissue infarction / necrosis (myocardial infarction, burns)',
      'Systemic inflammatory conditions',
      'Corticosteroid therapy & physical stress'
    ],
    causesLow: [
      'Chemotherapy / radiation bone marrow suppression',
      'Autoimmune neutropenia',
      'Severe overwhelming sepsis (marrow exhaustion)',
      'Viral infections (Hepatitis, HIV, Parvovirus)'
    ]
  },
  lymphocyte: {
    id: 'lymphocyte',
    name: 'Lymphocyte',
    scientificName: 'T-Cell, B-Cell, NK-Cell',
    category: 'Agranulocyte',
    membraneColor: '#38bdf8',
    nucleusColor: '#7c3aed',
    modelPath: '/models/cells/wbc_cytoplasm.glb',
    nucleusPath: '/models/cells/lymphocyte_nucleus.glb',
    isWbc: true,
    diameter: '7 – 12 µm',
    lifespan: 'Weeks to decades (memory cells)',
    normalRange: '1,000 – 3,000 /µL (ALC)',
    differentialPct: '20% – 40% of total WBC',
    description: 'The core effector cells of the adaptive immune system, orchestrating antigen-specific recognition, humoral antibody production, and cell-mediated cytotoxicity.',
    morphology: 'Large, round, deeply stained nucleus that occupies 85-90% of the entire cell volume with a thin crescent rim of pale blue agranular cytoplasm.',
    clinicalFunction: 'B-cells differentiate into antibody-secreting plasma cells; CD4+ T-cells coordinate immune signaling; CD8+ T-cells and NK-cells destroy virus-infected and malignant cells.',
    causesHigh: [
      'Acute viral infections (Infectious mononucleosis, CMV, Hepatitis)',
      'Chronic lymphocytic leukemia (CLL) & lymphomas',
      'Bordetella pertussis (whooping cough)',
      'Tuberculosis and toxoplasmosis'
    ],
    causesLow: [
      'Human Immunodeficiency Virus (HIV / AIDS CD4 drop)',
      'Systemic lupus erythematosus (SLE) and autoimmune diseases',
      'Severe glucocorticoid therapy / Cushing state',
      'Immunosuppressive chemotherapy'
    ]
  },
  monocyte: {
    id: 'monocyte',
    name: 'Monocyte / Macrophage',
    scientificName: 'Monocyte',
    category: 'Agranulocyte',
    membraneColor: '#06b6d4',
    nucleusColor: '#4f46e5',
    modelPath: '/models/cells/wbc_cytoplasm.glb',
    nucleusPath: '/models/cells/monocyte_nucleus.glb',
    isWbc: true,
    diameter: '15 – 20 µm (largest in blood)',
    lifespan: '1 – 3 days in blood (months as tissue macrophage)',
    normalRange: '200 – 800 /µL (AMC)',
    differentialPct: '2% – 8% of total WBC',
    description: 'The largest circulating leukocyte, serving as a circulating progenitor that migrates into peripheral tissues to differentiate into macrophages and dendritic cells.',
    morphology: 'Characteristic large kidney- or horseshoe-shaped folded nucleus with abundant ground-glass grayish-blue cytoplasm and digestive vacuoles.',
    clinicalFunction: 'Extensive phagocytosis of cellular debris and pathogens, antigen presentation via MHC-II to T-lymphocytes, and cytokine secretion (IL-1, TNF-α).',
    causesHigh: [
      'Chronic intracellular infections (Tuberculosis, Brucellosis, SBE)',
      'Inflammatory bowel disease (Crohn’s, Ulcerative Colitis)',
      'Chronic myelomonocytic leukemia (CMML)',
      'Recovery phase from acute bone marrow suppression'
    ],
    causesLow: [
      'Aplastic anemia',
      'Hairy cell leukemia',
      'Profound endotoxemia',
      'Corticosteroid administration'
    ]
  },
  eosinophil: {
    id: 'eosinophil',
    name: 'Eosinophil',
    scientificName: 'Eosinophilic Granulocyte',
    category: 'Granulocyte',
    membraneColor: '#f43f5e',
    nucleusColor: '#be185d',
    modelPath: '/models/cells/wbc_cytoplasm.glb',
    nucleusPath: '/models/cells/eosinophil_nucleus.glb',
    isWbc: true,
    diameter: '12 – 17 µm',
    lifespan: '8 – 12 hours in blood (8 – 12 days in tissue)',
    normalRange: '40 – 400 /µL (AEC)',
    differentialPct: '1% – 4% of total WBC',
    description: 'Granulocyte specialized for immunity against multicellular helminths and a key participant in allergic hypersensitivity and asthma pathophysiology.',
    morphology: 'Classic bilobed "spectacle-shaped" nucleus packed with bright brick-red / orange eosinophilic secondary granules containing Major Basic Protein (MBP).',
    clinicalFunction: 'Releases major basic protein, eosinophil cationic protein, and peroxidase to destroy parasitic helminths; modulates IgE-mediated mast cell reactions.',
    causesHigh: [
      'Allergic disorders (Asthma, allergic rhinitis, atopic dermatitis)',
      'Invasive parasitic helminth infections (Ascaris, Schistosoma, Strongyloides)',
      'Drug hypersensitivity reactions (DRESS syndrome)',
      'Hypereosinophilic syndrome (HES) & Churg-Strauss vasculitis'
    ],
    causesLow: [
      'Acute systemic stress & glucocorticoid release',
      'Cushing syndrome',
      'Acute bacterial bloodstream sepsis'
    ]
  },
  basophil: {
    id: 'basophil',
    name: 'Basophil',
    scientificName: 'Basophilic Granulocyte',
    category: 'Granulocyte',
    membraneColor: '#a855f7',
    nucleusColor: '#581c87',
    modelPath: '/models/cells/wbc_cytoplasm.glb',
    nucleusPath: '/models/cells/basophil_nucleus.glb',
    isWbc: true,
    diameter: '10 – 14 µm',
    lifespan: 'Few hours to several days',
    normalRange: '20 – 100 /µL (ABC)',
    differentialPct: '0.5% – 1% of total WBC',
    description: 'The rarest circulating white blood cell, equipped with high-affinity IgE receptors and dense granule stores of histamine and heparin.',
    morphology: 'Irregular bilobed or S-shaped nucleus frequently obscured by coarse, prominent dark purple-black basophilic granules.',
    clinicalFunction: 'Crosslinking of surface IgE triggers immediate granule exocytosis, releasing histamine, leukotrienes, and heparin in acute anaphylaxis and inflammation.',
    causesHigh: [
      'Myeloproliferative neoplasms (Chronic Myeloid Leukemia - CML)',
      'Severe systemic hypersensitivity & allergic reactions',
      'Hypothyroidism / myxedema',
      'Chronic hemolytic states'
    ],
    causesLow: [
      'Acute phase of severe allergic anaphylaxis (complete degranulation)',
      'Hyperthyroidism',
      'Prolonged corticosteroid therapy'
    ]
  },
  wbc_total: {
    id: 'wbc_total',
    name: 'Total White Blood Cells (WBC / TLC)',
    scientificName: 'Total Leukocytes',
    category: 'Total Leukocytes',
    membraneColor: '#0ea5e9',
    nucleusColor: '#6366f1',
    modelPath: '/models/cells/wbc_cytoplasm.glb',
    nucleusPath: '/models/cells/neutrophil_nucleus.glb',
    isWbc: true,
    diameter: '7 – 20 µm (Composite)',
    lifespan: 'Varies by leukocyte lineage',
    normalRange: '4,000 – 11,000 /µL',
    differentialPct: '100% Total Leukocyte Pool',
    description: 'The complete circulating immune system sentinel pool consisting of neutrophils, lymphocytes, monocytes, eosinophils, and basophils.',
    morphology: 'Composite leukocyte structure showing common protective cellular membrane housing specific nuclear chromatin architectures.',
    clinicalFunction: 'Innate and adaptive cellular immunity, phagocytosis, antimicrobial pathogen killing, antibody synthesis, and inflammatory surveillance.',
    causesHigh: [
      'Bacterial or viral infections (Leukocytosis)',
      'Systemic inflammatory conditions & tissue injury',
      'Leukemias & myeloproliferative disorders',
      'Physical/emotional stress, steroid medication'
    ],
    causesLow: [
      'Viral infections (HIV, Hepatitis, Influenza) (Leukopenia)',
      'Bone marrow disorders / aplasia',
      'Autoimmune destruction',
      'Chemotherapy & immunosuppressants'
    ]
  }
};

interface CellSceneProps {
  selectedCellId: CellTypeId;
  cytoplasmOpacity: number; // 0.1 to 1.0
  autoRotate: boolean;
  onSelectCell: (id: CellTypeId) => void;
  onProgress?: (pct: number) => void;
  onError?: (err: string) => void;
}

export default function CellScene({
  selectedCellId,
  cytoplasmOpacity = 0.42,
  autoRotate = true,
  onSelectCell,
  onProgress,
  onError
}: CellSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cellGroupRef = useRef<THREE.Group | null>(null);
  const cytoplasmMeshRef = useRef<THREE.Object3D | null>(null);
  const nucleusMeshRef = useRef<THREE.Object3D | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadPct, setLoadPct] = useState<number>(0);

  // Initialize Three.js Scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 50);
    camera.position.set(0, 0.45, 3.8);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      onError?.('WebGL 3D rendering is not supported by your browser.');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.6;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.92;
    controlsRef.current = controls;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xfff5ea, 2.4);
    mainKeyLight.position.set(3, 5, 4);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 1024;
    mainKeyLight.shadow.mapSize.height = 1024;
    scene.add(mainKeyLight);

    const softFillLight = new THREE.DirectionalLight(0x8bc0f8, 1.6);
    softFillLight.position.set(-4, 2, 2);
    scene.add(softFillLight);

    const backRimLight = new THREE.DirectionalLight(0xec4899, 1.8);
    backRimLight.position.set(0, 3, -4);
    scene.add(backRimLight);

    const bottomBounce = new THREE.DirectionalLight(0xa7f3d0, 0.8);
    bottomBounce.position.set(0, -3, 1);
    scene.add(bottomBounce);

    // Subtle Ground Pedestal
    const groundGeo = new THREE.CylinderGeometry(1.2, 1.25, 0.03, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.15,
      transparent: true,
      opacity: 0.7
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.85;
    ground.receiveShadow = true;
    scene.add(ground);

    const ringGeo = new THREE.RingGeometry(1.12, 1.15, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.83;
    scene.add(ring);

    // Main Cell Group
    const cellGroup = new THREE.Group();
    cellGroup.position.set(0, 0, 0);
    scene.add(cellGroup);
    cellGroupRef.current = cellGroup;

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotate && cellGroupRef.current) {
        cellGroupRef.current.rotation.y += 0.006;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Update Cytoplasm Opacity Dynamically
  useEffect(() => {
    if (!cytoplasmMeshRef.current) return;
    cytoplasmMeshRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.transparent = true;
            m.opacity = cytoplasmOpacity;
            m.depthWrite = cytoplasmOpacity > 0.85;
            m.needsUpdate = true;
          });
        } else if (mesh.material) {
          mesh.material.transparent = true;
          mesh.material.opacity = cytoplasmOpacity;
          mesh.material.depthWrite = cytoplasmOpacity > 0.85;
          mesh.material.needsUpdate = true;
        }
      }
    });
  }, [cytoplasmOpacity]);

  // Load 3D Models when selected cell changes
  useEffect(() => {
    const scene = sceneRef.current;
    const cellGroup = cellGroupRef.current;
    if (!scene || !cellGroup) return;

    setLoading(true);
    setLoadPct(10);
    onProgress?.(10);

    // Clear previous cell models
    while (cellGroup.children.length > 0) {
      const child = cellGroup.children[0];
      cellGroup.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }
    cytoplasmMeshRef.current = null;
    nucleusMeshRef.current = null;

    const cellConfig = CELL_DEFINITIONS[selectedCellId] || CELL_DEFINITIONS.rbc;
    const loader = new GLTFLoader();

    if (!cellConfig.isWbc) {
      // Single model (RBC or Platelet)
      loader.load(
        cellConfig.modelPath,
        (gltf) => {
          const model = gltf.scene;

          // Compute bounding box and center/scale
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0 ? 1.15 / maxDim : 1;
          model.scale.setScalar(targetScale);

          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center.multiplyScalar(targetScale));
          model.position.y += 0.05; // Slightly lift above platform

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              // Enhance material shaders for organic biological look
              if (mesh.material && !(mesh.material as THREE.Material).name.includes('enhanced')) {
                const standardMat = mesh.material as THREE.MeshStandardMaterial;
                standardMat.roughness = 0.35;
                standardMat.metalness = 0.08;
                standardMat.needsUpdate = true;
              }
            }
          });

          cellGroup.add(model);
          setLoadPct(100);
          onProgress?.(100);
          setLoading(false);
        },
        (xhr) => {
          if (xhr.total > 0) {
            const pct = Math.round((xhr.loaded / xhr.total) * 90);
            setLoadPct(pct);
            onProgress?.(pct);
          }
        },
        (err) => {
          console.error('Error loading cell model:', err);
          onError?.(`Failed to load ${cellConfig.name} 3D model.`);
          setLoading(false);
        }
      );
    } else {
      // WBC: Multi-part model (Outer translucent membrane + Inner detailed nucleus)
      let loadedParts = 0;
      const totalParts = cellConfig.nucleusPath ? 2 : 1;

      const checkDone = () => {
        loadedParts++;
        const pct = Math.round((loadedParts / totalParts) * 100);
        setLoadPct(pct);
        onProgress?.(pct);
        if (loadedParts >= totalParts) {
          setLoading(false);
        }
      };

      // 1. Load Translucent Cytoplasm / Outer Membrane
      loader.load(
        cellConfig.modelPath,
        (gltf) => {
          const cyto = gltf.scene;

          // Scale & Center
          const box = new THREE.Box3().setFromObject(cyto);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0 ? 1.25 / maxDim : 1;
          cyto.scale.setScalar(targetScale);

          const center = new THREE.Vector3();
          box.getCenter(center);
          cyto.position.sub(center.multiplyScalar(targetScale));
          cyto.position.y += 0.05;

          // Apply gorgeous translucent biological membrane shader
          cyto.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = false;
              mesh.receiveShadow = true;

              const glassMat = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(cellConfig.membraneColor),
                transparent: true,
                opacity: cytoplasmOpacity,
                roughness: 0.18,
                metalness: 0.05,
                transmission: 0.45,
                ior: 1.33, // Biological cytoplasm index of refraction
                reflectivity: 0.5,
                depthWrite: false,
                side: THREE.DoubleSide
              });
              mesh.material = glassMat;
            }
          });

          cytoplasmMeshRef.current = cyto;
          cellGroup.add(cyto);
          checkDone();
        },
        undefined,
        (err) => {
          console.error('Error loading WBC cytoplasm:', err);
          checkDone();
        }
      );

      // 2. Load Specific Nucleus Mesh inside
      if (cellConfig.nucleusPath) {
        loader.load(
          cellConfig.nucleusPath,
          (gltf) => {
            const nucleus = gltf.scene;

            // Scale & Center nucleus to fit harmoniously inside the cytoplasm
            const box = new THREE.Box3().setFromObject(nucleus);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            // Scale nucleus slightly smaller to nestle inside outer membrane
            const targetScale = maxDim > 0 ? 0.82 / maxDim : 1;
            nucleus.scale.setScalar(targetScale);

            const center = new THREE.Vector3();
            box.getCenter(center);
            nucleus.position.sub(center.multiplyScalar(targetScale));
            nucleus.position.y += 0.05;

            // Apply distinct stained chromatin shader
            nucleus.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const nucMat = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(cellConfig.nucleusColor || '#6366f1'),
                  roughness: 0.4,
                  metalness: 0.12,
                  emissive: new THREE.Color(cellConfig.nucleusColor || '#6366f1'),
                  emissiveIntensity: 0.18
                });
                mesh.material = nucMat;
              }
            });

            nucleusMeshRef.current = nucleus;
            cellGroup.add(nucleus);
            checkDone();
          },
          undefined,
          (err) => {
            console.error('Error loading WBC nucleus:', err);
            checkDone();
          }
        );
      }
    }
  }, [selectedCellId]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-gradient-to-b from-[#0b1320] via-[#111e33] to-[#0a0f1d]">
      {/* 3D WebGL Canvas Canvas Host */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Progress Bar */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0b1320]/80 backdrop-blur-md transition-opacity">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="w-6 h-6 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-white text-sm font-medium">
              Loading 3D {CELL_DEFINITIONS[selectedCellId]?.name || 'Cell'} ({loadPct}%)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
