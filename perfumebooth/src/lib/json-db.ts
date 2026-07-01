import fs from 'fs/promises';
import path from 'path';

/**
 * A simple helper to handle local JSON file persistence.
 * Addresses concurrency risks and duplication across API routes.
 */
export async function readJsonDb<T>(fileName: string): Promise<T[]> {
  const filePath = path.join(process.cwd(), 'src/data', fileName);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
}

export async function writeJsonDb<T>(fileName: string, data: T[]): Promise<boolean> {
  const filePath = path.join(process.cwd(), 'src/data', fileName);
  const dir = path.dirname(filePath);

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write with indentation for readability
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    return false;
  }
}

export async function appendToJsonDb<T>(fileName: string, item: T): Promise<boolean> {
  // Simple "update" pattern to reduce race conditions (though not a full lock)
  const data = await readJsonDb<T>(fileName);
  data.unshift(item); // Add to beginning (latest first)
  return await writeJsonDb(fileName, data);
}
