// University of Ibadan email domains
export const UNIVERSITY_EMAIL_DOMAINS = [
  '@ui.edu.ng', // Staff/Faculty
  '@stu.ui.edu.ng', // Students
  '@student.ui.edu.ng', // Students (Alternative)
  '@postgrad.ui.edu.ng', // Postgraduate Students
];

export const UNIVERSITY_EMAIL_DOMAIN = '@ui.edu.ng'; // Keep for backward compatibility

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

export const PASSWORD_HASH_ROUNDS = 12;

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
} as const;
