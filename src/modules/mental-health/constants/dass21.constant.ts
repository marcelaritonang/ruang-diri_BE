export const DASS21_QUESTIONS = [
  {
    id: 1,
    category: 'depression',
    text: 'I found it hard to experience any positive feeling at all',
    indonesian:
      'Saya sama sekali tidak dapat merasakan perasaan gembira, bangga, senang, bahagia',
  },
  {
    id: 2,
    category: 'depression',
    text: 'I found it difficult to work up the initiative to do things',
    indonesian: 'Saya merasa sulit berinisiatif melakukan sesuatu',
  },
  {
    id: 3,
    category: 'depression',
    text: 'I felt that I had nothing to look forward to',
    indonesian: 'Saya merasa tidak ada lagi yang bisa saya harapkan',
  },
  {
    id: 4,
    category: 'depression',
    text: 'I felt sad and depressed',
    indonesian: 'Saya merasa sedih dan tertekan',
  },
  {
    id: 5,
    category: 'depression',
    text: 'I was unable to become enthusiastic about anything',
    indonesian: 'Saya tidak bisa merasa antusias terhadap hal apapun',
  },
  {
    id: 6,
    category: 'depression',
    text: "I felt I wasn't worth much as a person",
    indonesian: 'Saya merasa diri saya tidak berharga',
  },
  {
    id: 7,
    category: 'depression',
    text: 'I felt that life was meaningless',
    indonesian: 'Saya merasa hidup ini tidak berarti',
  },

  {
    id: 8,
    category: 'anxiety',
    text: 'I was aware of dryness of my mouth',
    indonesian: 'Saya merasa mulut saya mudah kering',
  },
  {
    id: 9,
    category: 'anxiety',
    text: 'I experienced breathing difficulty without physical exertion',
    indonesian:
      'Saya merasa kesulitan bernafas padahal tidak melakukan aktivitas fisik sebelumnya',
  },
  {
    id: 10,
    category: 'anxiety',
    text: 'I experienced trembling (eg, in the hands)',
    indonesian: 'Saya merasa gemetar (misalnya pada tangan)',
  },
  {
    id: 11,
    category: 'anxiety',
    text: 'I was worried about situations in which I might panic and make a fool of myself',
    indonesian: 'Saya merasa khawatir akan mempermalukan diri saya sendiri',
  },
  {
    id: 12,
    category: 'anxiety',
    text: 'I felt I was close to panic',
    indonesian: 'Saya merasa hampir panik',
  },
  {
    id: 13,
    category: 'anxiety',
    text: 'I was aware of the action of my heart in the absence of physical exertion',
    indonesian:
      'Saya menyadari kondisi detak jantung saya tiba-tiba meningkat atau melemah, meskipun sedang tidak melakukan aktivitas fisik',
  },
  {
    id: 14,
    category: 'anxiety',
    text: 'I felt scared without any good reason',
    indonesian: 'Saya merasa ketakutan tanpa alasan yang jelas',
  },

  {
    id: 15,
    category: 'stress',
    text: 'I found it difficult to relax',
    indonesian: 'Saya merasa sulit untuk beristirahat',
  },
  {
    id: 16,
    category: 'stress',
    text: 'I tended to over-react to situations',
    indonesian:
      'Saya cenderung menunjukkan reaksi berlebihan terhadap suatu situasi',
  },
  {
    id: 17,
    category: 'stress',
    text: 'I felt that I was using a lot of nervous energy',
    indonesian: 'Saya merasa energi saya terkuras karena terlalu cemas',
  },
  {
    id: 18,
    category: 'stress',
    text: 'I found myself getting agitated',
    indonesian: 'Saya merasa gelisah',
  },
  {
    id: 19,
    category: 'stress',
    text: 'I found it hard to wind down',
    indonesian: 'Saya merasa sulit untuk merasa tenang',
  },
  {
    id: 20,
    category: 'stress',
    text: 'I was intolerant of anything that kept me from getting on with what I was doing',
    indonesian:
      'Saya sulit untuk bersabar dalam menghadapi gangguan yang terjadi ketika sedang melakukan sesuatu',
  },
  {
    id: 21,
    category: 'stress',
    text: 'I felt that I was rather touchy',
    indonesian: 'Perasaan saya mudah tergugah atau tersentuh',
  },
];

export const RESPONSE_OPTIONS = [
  { value: 0, label: 'Never', indonesian: 'Tidak Pernah' },
  { value: 1, label: 'Sometimes', indonesian: 'Terkadang' },
  { value: 2, label: 'Often', indonesian: 'Sering' },
  { value: 3, label: 'Almost Always', indonesian: 'Sangat Sering' },
];

export const CATEGORY_DESCRIPTIONS = {
  depression: {
    name: 'Depression',
    indonesian: 'Depresi',
    description:
      'Measures symptoms related to mood, hopelessness, and lack of interest',
    indonesianDescription:
      'Mengukur gejala terkait suasana hati, keputusasaan, dan kurangnya minat',
  },
  anxiety: {
    name: 'Anxiety',
    indonesian: 'Kecemasan',
    description:
      'Measures symptoms related to worry, panic, and physical anxiety symptoms',
    indonesianDescription:
      'Mengukur gejala terkait kekhawatiran, panik, dan gejala fisik kecemasan',
  },
  stress: {
    name: 'Stress',
    indonesian: 'Stres',
    description:
      'Measures symptoms related to tension, irritability, and being easily upset',
    indonesianDescription:
      'Mengukur gejala terkait ketegangan, mudah tersinggung, dan mudah terganggu',
  },
};

export const SEVERITY_LEVELS = {
  depression: [
    { range: [0, 9], label: 'Stabil', english: 'Normal', color: '#22c55e' },
    { range: [10, 13], label: 'Ringan', english: 'Mild', color: '#eab308' },
    { range: [14, 20], label: 'Sedang', english: 'Moderate', color: '#f97316' },
    {
      range: [21, 27],
      label: 'Mengkhawatirkan',
      english: 'Severe',
      color: '#ef4444',
    },
    {
      range: [28, 42],
      label: 'Sangat Mengkhawatirkan',
      english: 'Extremely Severe',
      color: '#dc2626',
    },
  ],
  anxiety: [
    { range: [0, 7], label: 'Stabil', english: 'Normal', color: '#22c55e' },
    { range: [8, 9], label: 'Ringan', english: 'Mild', color: '#eab308' },
    { range: [10, 14], label: 'Sedang', english: 'Moderate', color: '#f97316' },
    {
      range: [15, 19],
      label: 'Mengkhawatirkan',
      english: 'Severe',
      color: '#ef4444',
    },
    {
      range: [20, 42],
      label: 'Sangat Mengkhawatirkan',
      english: 'Extremely Severe',
      color: '#dc2626',
    },
  ],
  stress: [
    { range: [0, 14], label: 'Stabil', english: 'Normal', color: '#22c55e' },
    { range: [15, 18], label: 'Ringan', english: 'Mild', color: '#eab308' },
    { range: [19, 25], label: 'Sedang', english: 'Moderate', color: '#f97316' },
    {
      range: [26, 33],
      label: 'Mengkhawatirkan',
      english: 'Severe',
      color: '#ef4444',
    },
    {
      range: [34, 42],
      label: 'Sangat Mengkhawatirkan',
      english: 'Extremely Severe',
      color: '#dc2626',
    },
  ],
};
