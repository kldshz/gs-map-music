import raw from '../../data/demo.bundle.json';
import type { Dataset } from '../domain/contracts';

// The stage 1 probe verifies references and resources. This assertion is for
// this reviewed fixture only, not a validator for future untrusted imports.
export const dataset = raw as unknown as Dataset;
