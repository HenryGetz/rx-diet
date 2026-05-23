import type { ResumeData } from '../utils/types.js';
import type { DehydrateResult, DehydrateOptions } from './types.js';
export declare function dehydrate(data: ResumeData, sourcePath: string, _options?: DehydrateOptions): Promise<DehydrateResult>;
export declare function dehydrateFile(inputPath: string, options?: DehydrateOptions): Promise<DehydrateResult>;
