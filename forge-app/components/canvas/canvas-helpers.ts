import type { ForgePaper } from "@/lib/types";
import { TLShape, createShapeId } from "tldraw";

// Color palette matching FORGE design system
const COLORS = {
  paper: {
    fill: "var(--color-accent-dim)",
    stroke: "var(--color-accent)",
    text: "var(--color-text)",
  },
  opportunity: {
    fill: "var(--color-teal-dim)",
    stroke: "var(--color-teal)",
    text: "var(--color-teal)",
  },
  innovation: {
    fill: "var(--color-blue-dim)",
    stroke: "var(--color-blue)",
    text: "var(--color-blue)",
  },
  customer: {
    fill: "var(--color-sage-dim)",
    stroke: "var(--color-sage)",
    text: "var(--color-sage)",
  },
  connection: {
    stroke: "var(--color-muted)",
    text: "var(--color-faint)",
  },
};

// Status to color mapping
const STATUS_COLORS: Record<
  string,
  { fill: string; stroke: string }
> = {
  open: { fill: "var(--color-muted)", stroke: "var(--color-muted)" },
  building: { fill: "var(--color-teal)", stroke: "var(--color-teal)" },
  shipped: { fill: "var(--color-sage)", stroke: "var(--color-sage)" },
};

/**
 * Create a paper node shape
 */
export function createPaperNode(
  paper: ForgePaper,
  x: number,
  y: number
): TLShape {
  const statusColor = STATUS_COLORS[paper.status] || STATUS_COLORS.open;
  const truncatedTitle =
    paper.title.length > 60 ? paper.title.slice(0, 60) + "..." : paper.title;

  return {
    id: createShapeId(`paper-${paper.id}`),
    type: "geo",
    x,
    y,
    props: {
      geo: "rectangle",
      w: 280,
      h: 100,
      fill: "solid",
      color: "accent",
      label: truncatedTitle,
      font: "draw",
      align: "start",
      verticalAlign: "start",
      size: "s",
      dash: "solid",
      growY: 0,
      url: "",
    },
    meta: {
      paperId: paper.id,
      type: "paper",
      status: paper.status,
      arxivId: paper.arxivId,
    },
  } as unknown as TLShape;
}

/**
 * Create an idea/opportunity node shape
 */
export function createIdeaNode(
  paper: ForgePaper,
  text: string,
  x: number,
  y: number,
  nodeType: "opportunity" | "innovation" | "customer" | "general" = "general"
): TLShape {
  const colors =
    COLORS[nodeType] ||
    COLORS.general || {
      fill: "var(--color-elevated)",
      stroke: "var(--color-border)",
      text: "var(--color-text)",
    };

  const truncatedText =
    text.length > 120 ? text.slice(0, 120) + "..." : text;
  const label =
    nodeType.charAt(0).toUpperCase() + nodeType.slice(1) + ": " + truncatedText;

  return {
    id: createShapeId(`idea-${paper.id}-${nodeType}`),
    type: "geo",
    x,
    y,
    props: {
      geo: "rectangle",
      w: 240,
      h: 80,
      fill: "solid",
      color:
        nodeType === "opportunity"
          ? "green"
          : nodeType === "innovation"
          ? "blue"
          : "yellow",
      label: label,
      font: "draw",
      align: "start",
      verticalAlign: "start",
      size: "s",
      dash: "draw",
      growY: 0,
      url: "",
    },
    meta: {
      paperId: paper.id,
      type: nodeType,
      fullText: text,
    },
  } as unknown as TLShape;
}

/**
 * Create a connection/arrow between nodes
 */
export function createPipelineConnection(
  fromId: string,
  toId: string,
  label?: string
): TLShape {
  return {
    id: createShapeId(`arrow-${fromId}-${toId}`),
    type: "arrow",
    props: {
      bend: 0,
      start: {
        type: "binding",
        boundShapeId: fromId,
        normalizedAnchor: { x: 0.5, y: 1 },
        isExact: false,
      },
      end: {
        type: "binding",
        boundShapeId: toId,
        normalizedAnchor: { x: 0.5, y: 0 },
        isExact: false,
      },
      color: "grey",
      label: label || "",
      font: "draw",
      size: "s",
      dash: "solid",
      arrowheadStart: "none",
      arrowheadEnd: "arrow",
    },
  } as unknown as TLShape;
}

/**
 * Layout nodes in a pipeline/flow view
 * Papers flow left to right, with opportunities branching down
 */
export function layoutNodesInPipeline(
  papers: ForgePaper[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group papers by status
  const grouped = papers.reduce(
    (acc, paper) => {
      if (!acc[paper.status]) acc[paper.status] = [];
      acc[paper.status].push(paper);
      return acc;
    },
    {} as Record<string, ForgePaper[]>
  );

  const statuses = ["open", "building", "shipped"];
  const columnWidth = 400;
  const rowHeight = 200;
  const startX = -((statuses.length - 1) * columnWidth) / 2;

  statuses.forEach((status, colIndex) => {
    const group = grouped[status] || [];
    group.forEach((paper, rowIndex) => {
      const centerOffset = ((group.length - 1) * rowHeight) / 2;
      const x = startX + colIndex * columnWidth;
      const y = rowIndex * rowHeight - centerOffset;
      positions.set(paper.id, { x, y });
    });
  });

  return positions;
}

/**
 * Layout nodes in a free canvas view
 * Uses a force-directed-like approach with clustering by tags
 */
export function layoutNodesInCanvas(
  papers: ForgePaper[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group papers by shared tags
  const tagGroups = new Map<string, string[]>();
  papers.forEach((paper) => {
    paper.tags?.forEach((tag) => {
      if (!tagGroups.has(tag)) tagGroups.set(tag, []);
      tagGroups.get(tag)!.push(paper.id);
    });
  });

  // Sort tags by frequency
  const sortedTags = Array.from(tagGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6); // Top 6 tags

  // Position papers in a circle with tag clustering
  const centerRadius = 300;
  const angleStep = (2 * Math.PI) / Math.max(papers.length, 1);

  papers.forEach((paper, index) => {
    // Find which tag cluster this paper belongs to
    let clusterOffset = { x: 0, y: 0 };

    if (paper.tags) {
      for (let i = 0; i < sortedTags.length; i++) {
        const [tag, paperIds] = sortedTags[i];
        if (paperIds.includes(paper.id)) {
          const clusterAngle = (i * 2 * Math.PI) / sortedTags.length;
          clusterOffset = {
            x: Math.cos(clusterAngle) * 100,
            y: Math.sin(clusterAngle) * 100,
          };
          break;
        }
      }
    }

    // Base circular layout with cluster offset
    const angle = index * angleStep;
    const x = Math.cos(angle) * centerRadius + clusterOffset.x;
    const y = Math.sin(angle) * centerRadius + clusterOffset.y;

    positions.set(paper.id, { x, y });
  });

  return positions;
}

/**
 * Generate a color based on string hash
 */
export function getColorForString(str: string): string {
  const colors = [
    "var(--color-accent)",
    "var(--color-teal)",
    "var(--color-blue)",
    "var(--color-sage)",
    "var(--color-stone)",
    "var(--color-amber)",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Calculate NOVA score for visual sizing
 */
export function calculateNodeSize(paper: ForgePaper): {
  width: number;
  height: number;
} {
  let score = 200; // Base size

  // Boost for having complete analysis
  if (paper.opportunity) score += 40;
  if (paper.coreInnovation) score += 30;
  if (paper.targetCustomer) score += 30;
  if (paper.marketSize) score += 20;
  if (paper.moatAnalysis) score += 20;
  if (paper.first90Days?.length) score += paper.first90Days.length * 10;

  // Status bonus
  if (paper.status === "shipped") score += 50;
  else if (paper.status === "building") score += 30;

  // Engagement
  score += paper.followers.length * 5;
  score += paper.comments.length * 3;

  return {
    width: Math.min(score, 400),
    height: Math.min(score * 0.4, 160),
  };
}
