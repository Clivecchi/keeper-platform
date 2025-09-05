import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** high-res ms since epoch set by kamAudit/kamAuth start */
    requestStartTs?: number;

    /** KAM context populated by middleware chain */
    kam?: {
      keyId?: string;
      scopes?: string[];
      domainId?: string;
    };
  }
}


