import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_WIDTH = 1800;

export interface PreprocessResult {
  uri: string;
  width: number;
  height: number;
}

export async function preprocessDocumentImage(imageUri: string): Promise<PreprocessResult> {
  try {
    const context = ImageManipulator.manipulate(imageUri);
    const image = await context.renderAsync();
    const originalWidth = image.width;
    const originalHeight = image.height;

    if (originalWidth > MAX_WIDTH) {
      const scaleFactor = MAX_WIDTH / originalWidth;
      const newHeight = Math.round(originalHeight * scaleFactor);

      const resized = await ImageManipulator.manipulate(imageUri)
        .resize({ width: MAX_WIDTH, height: newHeight })
        .renderAsync();

      const result = await resized.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.9,
      });

      return { uri: result.uri, width: MAX_WIDTH, height: newHeight };
    }

    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.9,
    });

    return { uri: result.uri, width: originalWidth, height: originalHeight };
  } catch {
    return { uri: imageUri, width: 0, height: 0 };
  }
}
