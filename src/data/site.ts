// Everything personal that isn't a long-form Markdown entry lives here.
// Projects / research / writing live in src/content/*.

export const site = {
  name: 'Anushka Khot',
  firstName: 'Anushka',
  handle: 'anushka',
  host: 'fedora',
  title: 'Anushka Khot — CS engineering student',
  description:
    'Personal corner of the internet of Anushka Khot: computer science engineering student who builds software, explores research and lives in a Linux terminal.',
  tagline: 'CS engineering student · builds software · pokes at research · lives in a Linux terminal',
  location: 'India',
  email: 'anushkakhot2020@gmail.com',
  resumePdf: '/resume.pdf', // drop your PDF at public/resume.pdf
  socials: [
    { label: 'GitHub', url: 'https://github.com/anushka0626', handle: '@anushka0626' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/anushka-khot-993394336/', handle: 'in/anushka-khot' },
    { label: 'LeetCode', url: 'https://leetcode.com/u/anushka066/', handle: 'u/anushka066' },
    { label: 'Design portfolio', url: 'https://drive.google.com/drive/folders/1Ag0k9OLuK2iFYtYEIl44RiG3tiPdCyo0?usp=sharing', handle: 'Google Drive' },
    { label: 'Email', url: 'mailto:anushkakhot2020@gmail.com', handle: 'anushkakhot2020@gmail.com' },
  ],
  // Media-player gadget. "Now playing" needs the SPOTIFY_* env vars (see README);
  // when nothing is playing (or they aren't set) the gadget shows this playlist instead.
  spotify: {
    playlist: {
      name: 'on repeat lately',
      url: 'https://open.spotify.com/playlist/443zNA0Ags0cq4vyH3JdTd',
    },
  },
  // Shown on the sticky-note gadget.
  github: 'anushka0626', // commit-garden gadget
  // Your birthday as 'MM-DD' → the Start orb dresses up for it (null = off).
  birthday: '02-06' as string | null,
  stickyNote: [
    'currently:',
    '★ writing eBPF schedulers',
    '★ benchmarking dynamic graphs',
    '★ shipping this website',
  ],
};

// About window: "then → now" story.
export const about = {
  intro:
    "Hi! I'm Anushka. I study computer science engineering, and I like building things that are both technically solid and a little bit delightful.",
  story: [
    {
      year: '2010',
      title: 'First computer',
      text: 'A PC running Windows 7. Glossy blue taskbar, the startup sound, and a desktop that felt like a room I was allowed to rearrange.',
    },
    {
      year: 'then',
      title: 'Games & doodles',
      text: 'Purble Place, pixel-art games, and every interactive Google Doodle I could find. Computers were toys before they were tools.',
    },
    {
      year: 'later',
      title: 'Exploring the internet',
      text: 'Customising things, breaking things, searching how to fix them. Discovering that every interface was made by a person.',
    },
    {
      year: 'now',
      title: 'Engineering',
      text: 'Linux, terminals, systems, research and software projects. Same curiosity, much better tools.',
    },
  ],
  facts: [
    ['studying', 'Computer Science, VIT Pune'],
    ['daily driver', 'Fedora Linux'],
    ['editor', 'VS Code'],
    ['likes', 'systems, UI, research, pixel art'],
  ],
};

export const experience = [
  {
    role: 'Open Source Contributor',
    org: 'ECSoC (Elite Coders)',
    date: 'June – August 2026',
    points: ['Selected as an open-source contributor to community-driven repositories, taking part in code reviews and submitting PRs with Git/GitHub workflows.'],
    tech: ['Git', 'GitHub', 'Open source'],
  },
  {
    role: 'Branding Executive',
    org: 'Abhivriddhi: Student Development Committee',
    date: 'September 2025 – May 2026',
    points: [
      'Coordinated four domains (Website Development, Database Management, Graphic Design and Video/Photography), leading a multidisciplinary team that delivered digital assets and web solutions for university-wide events.',
      'Managed the technical architecture and database integrity of club web projects, keeping frontend design and backend functionality integrated.',
    ],
    tech: ['Web development', 'Databases', 'Design', 'Team lead'],
  },
];

export const awards = [
  {
    title: '1st Runner Up, Globathon 2026 (FinTech Track)',
    text: 'Built AdviceGuard, an AI-powered wealth advisory copilot.',
    url: '/projects/adviceguard',
  },
  { title: 'Internal Smart India Hackathon', text: "Ranked 6th among 364 teams in the college's internal selection round." },
  {
    title: 'SheFi Scholar (June – July 2026)',
    text: 'Selective scholarship for intensive hands-on training in Web3 infrastructure, DeFi, smart contract security and AI-native workflows.',
  },
];

export const education = [
  {
    school: 'Vishwakarma Institute of Technology, Pune',
    degree: 'Bachelor of Computer Science',
    date: 'Expected June 2028',
    note: 'Cumulative GPA (through 4th semester): 9.05',
  },
];

export const skills = {
  Languages: ['C++', 'Python', 'SQL'],
  Systems: ['Linux', 'OS fundamentals', 'Process & thread management', 'Memory management', 'Concurrency'],
  'Software development': ['Google Cloud Run', 'REST APIs', 'Git', 'SQLite', 'React', 'Node.js', 'Streamlit', 'FastAPI'],
  'UI/UX & design': ['Figma', 'Canva', 'Affinity Designer', 'CapCut'],
};

// Recycle Bin easter egg: abandoned ideas.
export const recycleBin = [
  { name: 'website_v1_dark_purple_gradient.html', note: 'every dev portfolio ever. deleted.' },
  { name: 'todo_app_final_FINAL_v3.zip', note: 'the rite of passage' },
  { name: 'my_own_programming_language.txt', note: 'got as far as the name' },
  { name: 'barbie_theme_everything.css', note: 'a little too much. kept 2%.' },
  { name: 'arch_install_attempt_4.log', note: "it's fine. I use Fedora now." },
];
