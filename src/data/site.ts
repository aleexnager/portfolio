// Single source of truth for the site's content.
// To add a project, append an entry to `projects`. To change the homelab
// diagram, edit `homelab`. Nothing else needs to change.

export const profile = {
  name: "Alejandro Náger",
  fullName: "Alejandro Náger Fernández-Calvo",
  role: "Cybersecurity Risk Analyst",
  company: "PwC Spain",
  location: "Madrid, Spain",
  email: "a.nager@me.com",
  github: "https://github.com/aleexnager",
  githubUser: "aleexnager",
  linkedin: "https://www.linkedin.com/in/anager",
  cv: "alejandro-nager-cv.pdf",
  // First professional role. Used to compute years of experience.
  careerStart: "2024-06-01",
};

export type Experience = {
  company: string;
  role: string;
  start: string; // YYYY-MM
  end: string | null; // null = present
  location: string;
  summary: string;
  highlights: string[];
  stack: string[];
};

export const experience: Experience[] = [
  {
    company: "PwC",
    role: "Cybersecurity Risk Analyst",
    start: "2025-08",
    end: null,
    location: "Madrid",
    summary:
      "Cyber risk, IT audit and GRC engagements for large organisations, including critical-infrastructure operators.",
    highlights: [
      "Run risk analysis and management against ENS, NIS2, ISO 27001, NIST and MAGERIT.",
      "Deliver IT audits and security assessments for clients such as Redeia and CORPME.",
      "Assess control design, process maturity and regulatory compliance in GRC programmes.",
      "Support threat and vulnerability management and cyber threat intelligence for leadership decisions.",
      "Automate risk analysis with PILAR, SQL and Python, and write the executive and technical reports.",
    ],
    stack: ["ENS", "NIS2", "ISO 27001", "NIST CSF", "MAGERIT", "PILAR", "Python", "SQL"],
  },
  {
    company: "NalCOM Servicios Informáticos",
    role: "Full Stack Software Engineer (.NET)",
    start: "2024-06",
    end: "2025-08",
    location: "Madrid",
    summary:
      "Business web applications on .NET for regulated industries, from database model to UI.",
    highlights: [
      "Built full-stack MVC applications with C#, Entity Framework, JavaScript and Bootstrap.",
      "Designed and tuned SQL Server data models and queries.",
      "Shipped for pharmaceutical clients such as Novo Nordisk.",
      "Worked in Azure DevOps Server for version control, tracking and continuous deployment.",
    ],
    stack: ["C#", ".NET", "Entity Framework", "SQL Server", "JavaScript", "Azure DevOps"],
  },
];

export const education = [
  {
    title: "MSc in Cybersecurity",
    school: "Universidad Complutense de Madrid",
    detail: "Offensive and defensive security. Reverse engineering, exploiting, red and purple team, applied cryptography.",
    status: "In progress",
  },
  {
    title: "BSc in Computer Engineering",
    school: "Universidad Politécnica de Madrid",
    detail: "Thesis on entropy-optimised image steganography.",
    status: null,
  },
  {
    title: "International Baccalaureate Diploma",
    school: "Mirabal International School, Madrid",
    detail: "Taught in English.",
    status: null,
  },
];

export const certifications = [
  { name: "Esquema Nacional de Seguridad (ENS)", issuer: "CCN-CERT", url: null },
  { name: "Auditing the ENS", issuer: "CCN-CERT", url: null },
  { name: "Analysis and Risk Management of Information Systems", issuer: "CCN-CERT", url: null },
  {
    name: "Data Analysis and Presentation Skills: the PwC Approach",
    issuer: "PwC on Coursera",
    url: "https://www.coursera.org/account/accomplishments/specialization/LGIRIHK7HU0B",
  },
  {
    name: "Introduction to Generative AI",
    issuer: "Google Cloud",
    url: "https://www.cloudskillsboost.google/public_profiles/2952dff1-1d86-4783-bc9f-4e73341fb701/badges/8111161",
  },
  {
    name: "Introduction to Responsible AI",
    issuer: "Google Cloud",
    url: "https://www.cloudskillsboost.google/public_profiles/2952dff1-1d86-4783-bc9f-4e73341fb701/badges/8083372",
  },
  { name: "Cambridge C1 Advanced", issuer: "Cambridge English", url: null },
];

export const categories = [
  { id: "all", label: "All" },
  { id: "security", label: "Security" },
  { id: "apps", label: "Apps" },
  { id: "systems", label: "Systems" },
  { id: "algorithms", label: "Algorithms" },
] as const;

export type CategoryId = Exclude<(typeof categories)[number]["id"], "all">;

export type Project = {
  slug: string;
  title: string;
  blurb: string;
  category: CategoryId;
  stack: string[];
  year: number;
  repo?: string;
  live?: string;
  // Screenshot file name in src/assets/shots (portrait phone capture).
  shot?: "temazos" | "recipemaker" | "cronowork";
  status?: "In progress" | "Private code";
};

export const projects: Project[] = [
  {
    slug: "mcp-guard",
    title: "MCP Guard",
    blurb: "Master's thesis. Security controls for AI agents that call tools through the Model Context Protocol.",
    category: "security",
    stack: ["AI security", "MCP"],
    year: 2026,
    status: "In progress",
  },
  {
    slug: "temazos",
    title: "Temazos",
    blurb: "Multiplayer music party game. Peer-to-peer rooms over WebRTC with a host-authoritative rules engine, 816 curated songs and QR join.",
    category: "apps",
    stack: ["React", "TypeScript", "WebRTC", "PWA"],
    year: 2026,
    repo: "https://github.com/aleexnager/Hitster",
    live: "https://aleexnager.github.io/Hitster/",
    shot: "temazos",
  },
  {
    slug: "recipemaker",
    title: "RecipeMaker",
    blurb: "Pantry-aware recipe planner. Scan barcodes, track kitchen tools and see what you can cook now, with nutrition per serving. Fully offline.",
    category: "apps",
    stack: ["React", "TypeScript", "IndexedDB", "PWA"],
    year: 2026,
    repo: "https://github.com/aleexnager/RecipeMaker",
    live: "https://recipemaker-tau.vercel.app",
    shot: "recipemaker",
  },
  {
    slug: "cronowork",
    title: "CronoWork",
    blurb: "Installable interval timer for the gym. Zero dependencies, offline service worker, Wake Lock and per-phase audio cues.",
    category: "apps",
    stack: ["HTML", "JavaScript", "PWA"],
    year: 2026,
    repo: "https://github.com/aleexnager/CronoWork",
    live: "https://aleexnager.github.io/CronoWork/",
    shot: "cronowork",
  },
  {
    slug: "reversing",
    title: "Reverse engineering and exploiting",
    blurb: "Crackmes, a real .NET malware sample and ransomware challenges, then exploitation of legacy Windows hosts with Metasploit.",
    category: "security",
    stack: ["x86", ".NET", "Metasploit", "Nmap"],
    year: 2026,
    repo: "https://github.com/aleexnager/ReverseEngineeringAndExploiting",
  },
  {
    slug: "redteam",
    title: "Red team and purple team",
    blurb: "Command injection, file inclusion and SSI on bWAPP, reverse shells and privilege escalation to full control, with the matching fixes.",
    category: "security",
    stack: ["Web exploitation", "Privilege escalation"],
    year: 2026,
    repo: "https://github.com/aleexnager/RedTeam",
  },
  {
    slug: "applied-crypto",
    title: "Applied cryptography",
    blurb: "Key derivation for per-file encryption, authenticated encryption with AES-GCM and elliptic-curve signatures with OpenSSL.",
    category: "security",
    stack: ["OpenSSL", "AES-GCM", "ECDSA", "Python"],
    year: 2026,
    repo: "https://github.com/aleexnager/Applied_Cryptography",
  },
  {
    slug: "tennis",
    title: "Tennis tournament manager",
    blurb: "Web app to create and run tennis tournaments, built for the Software Engineering course at UPM.",
    category: "apps",
    stack: ["Next.js", "TypeScript", "MongoDB"],
    year: 2024,
    repo: "https://github.com/aleexnager/tennis-tournament",
  },
  {
    slug: "compiler",
    title: "Language processor",
    blurb: "Compiler for a JavaScript subset in C: lexer, parser, semantic analysis and symbol tables.",
    category: "algorithms",
    stack: ["C", "Compilers"],
    year: 2024,
    repo: "https://github.com/aleexnager/PdL",
  },
  {
    slug: "minishell",
    title: "Minishell",
    blurb: "A working UNIX shell in C with pipes, redirections and background jobs. Code kept private under university policy.",
    category: "systems",
    stack: ["C", "POSIX"],
    year: 2024,
    status: "Private code",
  },
  {
    slug: "distributed",
    title: "Distributed systems",
    blurb: "Client and server components over raw sockets, with shared protocol code and file transfer.",
    category: "systems",
    stack: ["C", "Sockets"],
    year: 2024,
    repo: "https://github.com/aleexnager/Distributed-Systems",
  },
  {
    slug: "m88110",
    title: "Text compressor in assembly",
    blurb: "A complete data compressor written in Motorola 88110 assembly.",
    category: "systems",
    stack: ["Assembly", "M88110"],
    year: 2023,
    repo: "https://github.com/aleexnager/Motorola-Assembly-M88110",
  },
  {
    slug: "io-interrupts",
    title: "Interrupt-driven I/O",
    blurb: "Input and output module for the MC68681 DUART, driven by interrupts in assembly.",
    category: "systems",
    stack: ["Assembly", "MC68681"],
    year: 2024,
    repo: "https://github.com/aleexnager/I-O-via-Interrupts",
  },
  {
    slug: "racecourse",
    title: "Threaded racecourse",
    blurb: "Terminal race game where every horse is a thread, synchronised with semaphores.",
    category: "systems",
    stack: ["C", "pthreads"],
    year: 2024,
    repo: "https://github.com/aleexnager/Hipodromo",
  },
  {
    slug: "astar",
    title: "A* on the Lyon metro",
    blurb: "Shortest-path search across the Lyon metro network with an admissible heuristic.",
    category: "algorithms",
    stack: ["Python", "Search"],
    year: 2024,
    repo: "https://github.com/aleexnager/IA",
  },
  {
    slug: "shell-automation",
    title: "Shell automation",
    blurb: "Self-updating script for Linux and WSL plus a reproducible terminal environment with one setup command.",
    category: "systems",
    stack: ["Bash", "Linux"],
    year: 2023,
    repo: "https://github.com/aleexnager/env_config",
  },
];

// Homelab diagram. Edit freely: the diagram renders whatever is listed here.
export const homelab = {
  host: { name: "Proxmox VE", detail: "Single-node hypervisor" },
  edge: { name: "Firewall", detail: "Inter-VLAN policy, default deny" },
  segments: [
    {
      id: "core",
      name: "Core services",
      vlan: 10,
      policy: "Serves DNS, reverse proxy and VPN to trusted segments.",
      nodes: [
        { name: "DNS filtering", kind: "LXC" },
        { name: "Reverse proxy + TLS", kind: "LXC" },
        { name: "VPN gateway", kind: "LXC" },
      ],
    },
    {
      id: "ops",
      name: "Observability",
      vlan: 20,
      policy: "Pulls metrics from all segments. Nothing initiates into it.",
      nodes: [
        { name: "Metrics and dashboards", kind: "LXC" },
        { name: "Backups", kind: "VM" },
      ],
    },
    {
      id: "lab",
      name: "Security lab",
      vlan: 30,
      policy: "Isolated. No route to core, observability or OT.",
      nodes: [
        { name: "Attack box", kind: "VM" },
        { name: "Vulnerable targets", kind: "VM" },
      ],
    },
    {
      id: "ot",
      name: "OT bench",
      vlan: 40,
      policy: "Isolated. Read-only polling from observability.",
      nodes: [
        { name: "PLC simulator", kind: "VM" },
        { name: "HMI", kind: "VM" },
      ],
    },
  ],
};
