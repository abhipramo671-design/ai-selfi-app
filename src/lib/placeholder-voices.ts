
import data from './placeholder-voices.json';

export type VoicePlaceholder = {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
};

export const PlaceholderVoices: VoicePlaceholder[] = data.placeholderVoices;
