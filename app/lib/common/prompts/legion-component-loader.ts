import componentData from '../component.json';

interface ComponentDocument {
  title: string;
  context: string;
  usage: string;
  attrs: string;
  raw: string;
  file: string;
  path: string;
  component: string;
  slug: string;
  last_modified: string;
}

interface Component {
  name: string;
  slug: string;
  path: string;
  document_count: number;
  documents: ComponentDocument[];
}

/**
 * Generate the Legion UI component documentation content from component.json
 * @returns The complete Legion UI component documentation as a string
 */
function generateLegionComponentDocs(): string {
  const components = componentData as Component[];
  
  const docsContent = `Legion UI (@legion-ui-kit/react-core) Documentation

## Setup

\`\`\`bash
npm install @legion-ui-kit/react-core
\`\`\`

\`\`\`javascript
// Required imports in your root layout
import '@legion-ui-kit/react-core/styles/core-styles.css'
import '@legion-ui-kit/react-core/styles/legion.css' // Default tokens (recommended)
\`\`\`

## Usage

\`\`\`javascript
import { Button } from '@legion-ui-kit/react-core';
// For Next.js: use '/client' or '/server' suffix for specific component types
// Client-only: Accordion, CustomSelect, Dropdown, Modal, Pagination, Sidebar, Snackbar, Tabs, Tooltip
\`\`\`

## Components

${JSON.stringify({ components }, null, 2)}
`;

  return docsContent;
}

export function getLegionComponentDocs(): string {
  return generateLegionComponentDocs();
}
