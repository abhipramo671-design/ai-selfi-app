
'use server';

/**
 * @fileOverview A Genkit flow for generating professional AI portraits from user selfies with style options.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GeneratePortraitInputSchema = z.object({
  imageUrls: z.array(z.string()).describe('Array of download URLs for the reference selfies.'),
  userId: z.string().describe('The ID of the user.'),
  style: z.enum(['realistic', 'anime', 'cartoon']).default('realistic').describe('The desired artistic style of the portrait.'),
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
    
    let stylePrompt = "";
    switch (input.style) {
      case 'anime':
        stylePrompt = "Studio Ghibli style anime portrait, vibrant colors, detailed line art, hand-drawn aesthetic, cinematic lighting.";
        break;
      case 'cartoon':
        stylePrompt = "3D Pixar style cartoon character, cute expressive features, soft studio lighting, smooth textures, vibrant toy-like colors.";
        break;
      case 'realistic':
      default:
        stylePrompt = "Ultra-realistic professional studio portrait, high-end corporate headshot, soft 3-point lighting, blurred office background, 8k resolution, highly detailed skin texture.";
        break;
    }

    const { media } = await ai.generate({
      model: 'googleai/imagen-3.0-generate-001',
      prompt: `Generate a high-quality portrait of the person in the reference image. 
      Style: ${stylePrompt}
      Reference Image: ${primaryImage}`,
      config: {
        // Additional config for Imagen if needed
      }
    });

    if (!media || !media.url) {
      throw new Error('Image generation model currently unavailable or failed to produce a result.');
    }

    return {
      imageUrl: media.url,
    };
  }
);
