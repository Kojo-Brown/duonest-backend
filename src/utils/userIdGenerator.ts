const adjectives = [
  'happy', 'sleepy', 'clever', 'brave', 'gentle', 'swift', 'bright', 'calm',
  'funny', 'lucky', 'quiet', 'smart', 'kind', 'wild', 'bold', 'cool',
  'warm', 'sweet', 'sharp', 'quick', 'nice', 'wise', 'pure', 'soft'
];

const nouns = [
  'cat', 'dog', 'bird', 'fish', 'fox', 'owl', 'bee', 'ant',
  'lion', 'bear', 'deer', 'wolf', 'duck', 'frog', 'mouse', 'snake',
  'star', 'moon', 'sun', 'cloud', 'tree', 'leaf', 'rock', 'wave'
];

export function generateRandomUserId(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const numbers = Math.floor(Math.random() * 9000) + 1000; // 4-digit number from 1000-9999
  
  return `${adjective}-${noun}-${numbers}`;
}

export function validateUserIdFormat(userId: string): boolean {
  // Pattern: adjective-noun-4digits
  const pattern = /^[a-z]+-[a-z]+-\d{4}$/;
  return pattern.test(userId);
}