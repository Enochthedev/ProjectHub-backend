export const SPECIALIZATIONS = [
  'Artificial Intelligence & Machine Learning',
  'Web Development & Full Stack',
  'Mobile Application Development',
  'Cybersecurity & Information Security',
  'Data Science & Analytics',
  'Cloud Computing & DevOps',
  'Software Engineering & Architecture',
  'Human-Computer Interaction',
  'Database Systems & Management',
  'Network Systems & Administration',
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
