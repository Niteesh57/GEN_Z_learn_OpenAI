export type NarrationVoiceGender = 'female' | 'male';

export interface NaturalNarrationVoice {
  id: string;
  name: string;
  gender: NarrationVoiceGender;
  browserPattern: RegExp;
}

// This is the single approved Microsoft Natural voice catalogue used by
// Reels, GIF Learning, and Comics. IDs are validated again by the backend.
export const NATURAL_NARRATION_VOICES: NaturalNarrationVoice[] = [
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava', gender: 'female', browserPattern: /Microsoft Ava Online \(Natural\)/i },
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew', gender: 'male', browserPattern: /Microsoft Andrew Online \(Natural\)/i },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma', gender: 'female', browserPattern: /Microsoft Emma Online \(Natural\)/i },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian', gender: 'male', browserPattern: /Microsoft Brian Online \(Natural\)/i },
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', browserPattern: /Microsoft Jenny Online \(Natural\)/i },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', browserPattern: /Microsoft Guy Online \(Natural\)/i },
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', browserPattern: /Microsoft Aria Online \(Natural\)/i },
  { id: 'en-ZA-LeahNeural', name: 'Leah', gender: 'female', browserPattern: /Microsoft Leah Online \(Natural\)/i },
  { id: 'en-ZA-LukeNeural', name: 'Luke', gender: 'male', browserPattern: /Microsoft Luke Online \(Natural\)/i },
  { id: 'en-AU-WilliamMultilingualNeural', name: 'William Multilingual', gender: 'male', browserPattern: /Microsoft William Multilingual Online \(Natural\)/i },
  { id: 'en-AU-NatashaNeural', name: 'Natasha', gender: 'female', browserPattern: /Microsoft Natasha Online \(Natural\)/i },
];

export const narrationVoiceFor = (gender: NarrationVoiceGender, seed: string) => {
  const matchingVoices = NATURAL_NARRATION_VOICES.filter((voice) => voice.gender === gender);
  const value = Array.from(seed || 'Narrator').reduce((total, character) => total + character.charCodeAt(0), 0);
  return matchingVoices[value % matchingVoices.length];
};

export const randomNarrationVoice = (gender?: NarrationVoiceGender) => {
  const pool = gender ? NATURAL_NARRATION_VOICES.filter((voice) => voice.gender === gender) : NATURAL_NARRATION_VOICES;
  return pool[Math.floor(Math.random() * pool.length)];
};
