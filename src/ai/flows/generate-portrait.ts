'use server';

/**
 * @fileOverview A Genkit flow for generating professional AI portraits from user selfies with enhanced style options and intensity control.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePortraitInputSchema = z.object({
  imageUrls: z.array(z.string()).describe('Array of download URLs for the reference selfies.'),
  userId: z.string().describe('The ID of the user.'),
  style: z.enum(['realistic', 'anime', 'cartoon', 'cyberpunk', 'oil-painting', 'sketch']).default('realistic').describe('The desired artistic style.'),
  intensity: z.number().min(0).max(100).default(50).describe('Intensity of the style effect (0-100).'),
});
export type GeneratePortraitInput = z.infer<typeof GeneratePortraitInputSchema>;

const GeneratePortraitOutputSchema = z.object({
  imageUrl: z.string().describe('The generated portrait data URI or URL.'),
});
export type GeneratePortraitOutput = z.infer<typeof GeneratePortraitOutputSchema>;

export async function generateAIPortrait(input: GeneratePortraitInput): Promise<GeneratePortraitOutput> {
  return generateAIPortraitFlow(input);
}

const generateAIPortraitFlow = ai.defineFlow(
  {
    name: 'generateAIPortraitFlow',
    inputSchema: GeneratePortraitInputSchema,
    outputSchema: GeneratePortraitOutputSchema,
  },
  async (input) => {
    const primaryImage = input.imageUrls[0];
    const weight = input.intensity / 100;
    
    let stylePrompt = "";
    switch (input.style) {
      case 'anime':
        stylePrompt = `Studio Ghibli style anime portrait, vibrant colors, detailed line art, hand-drawn aesthetic. Level of stylization: ${weight}.`;
        break;
      case 'cartoon':
        stylePrompt = `3D Pixar style cartoon character, cute expressive features, soft studio lighting, smooth textures. Level of stylization: ${weight}.`;
        break;
      case 'cyberpunk':
        stylePrompt = `Neon-drenched cyberpunk aesthetic, futuristic tech-wear, glowing accents, cinematic rainy night background, high contrast. Level of stylization: ${weight}.`;
        break;
      case 'oil-painting':
        stylePrompt = `Classic oil painting style, visible thick brushstrokes, rich textures, Renaissance color palette, dramatic lighting. Level of stylization: ${weight}.`;
        break;
      case 'sketch':
        stylePrompt = `Detailed charcoal and pencil sketch on textured paper, artistic cross-hatching, high contrast black and white. Level of stylization: ${weight}.`;
        break;
      case 'realistic':
      default:
        stylePrompt = `Ultra-realistic professional studio portrait, high-end corporate headshot, soft 3-point lighting, 8k resolution. Level of detail enhancement: ${weight}.`;
        break;
    }

    const { media } = await ai.generate({
      model: 'googleai/imagen-3.0-generate-001',
      prompt: `Generate a high-quality portrait of the person in the reference image. 
      Style: ${stylePrompt}
      Reference Image: ${primaryImage}
      Keep facial features recognizable but fully integrate into the chosen style.`,
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed. Please try again.');
    }

    return {
      imageUrl: media.url,
    };
  }
);
