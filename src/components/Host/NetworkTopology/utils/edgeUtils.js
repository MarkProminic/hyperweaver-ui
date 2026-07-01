import { Position } from '@xyflow/react';

// Calculate intersection point on rectangle perimeter
const getIntersectionPoint = (centerX, centerY, width, height, angle) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Calculate intersection with rectangle perimeter
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Check intersection with each edge
  let intersectionX;
  let intersectionY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Intersects with left or right edge
    intersectionX = dx > 0 ? centerX + halfWidth : centerX - halfWidth;
    intersectionY = centerY + ((intersectionX - centerX) * dy) / dx;

    // Clamp to rectangle bounds
    intersectionY = Math.max(centerY - halfHeight, Math.min(centerY + halfHeight, intersectionY));
  } else {
    // Intersects with top or bottom edge
    intersectionY = dy > 0 ? centerY + halfHeight : centerY - halfHeight;
    intersectionX = centerX + ((intersectionY - centerY) * dx) / dy;

    // Clamp to rectangle bounds
    intersectionX = Math.max(centerX - halfWidth, Math.min(centerX + halfWidth, intersectionX));
  }

  return { x: intersectionX, y: intersectionY };
};

// Determine React Flow position based on intersection point
const getPositionFromIntersection = (
  centerX,
  centerY,
  width,
  height,
  intersectionX,
  intersectionY
) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const distToTop = Math.abs(intersectionY - (centerY - halfHeight));
  const distToBottom = Math.abs(intersectionY - (centerY + halfHeight));
  const distToLeft = Math.abs(intersectionX - (centerX - halfWidth));
  const distToRight = Math.abs(intersectionX - (centerX + halfWidth));

  const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);

  if (minDist === distToTop) {
    return Position.Top;
  }
  if (minDist === distToBottom) {
    return Position.Bottom;
  }
  if (minDist === distToLeft) {
    return Position.Left;
  }
  return Position.Right;
};

// Calculate clean floating edge connection points
export const getEdgeParams = (sourceNode, targetNode, flowDirection = 'rx') => {
  if (!sourceNode || !targetNode) {
    return {
      sx: 0,
      sy: 0,
      tx: 0,
      ty: 0,
      sourcePos: Position.Bottom,
      targetPos: Position.Top,
    };
  }

  const sourcePosition = sourceNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;
  const sourceBounds = sourceNode.measured || { width: 40, height: 40 };
  const targetBounds = targetNode.measured || { width: 40, height: 40 };

  // Calculate node centers
  const sourceCenterX = sourcePosition.x + sourceBounds.width / 2;
  const sourceCenterY = sourcePosition.y + sourceBounds.height / 2;
  const targetCenterX = targetPosition.x + targetBounds.width / 2;
  const targetCenterY = targetPosition.y + targetBounds.height / 2;

  // Calculate angle from source to target
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const angle = Math.atan2(dy, dx);

  // Add angular offset for flow direction to prevent overlap - significantly increased for VNIC-to-zone visibility
  const flowOffset = flowDirection === 'rx' ? -0.4 : 0.4;
  const sourceAngle = angle + flowOffset;
  const targetAngle = angle + Math.PI + flowOffset; // Opposite direction

  // Calculate intersection points on node perimeters
  const sourceIntersection = getIntersectionPoint(
    sourceCenterX,
    sourceCenterY,
    sourceBounds.width,
    sourceBounds.height,
    sourceAngle
  );

  const targetIntersection = getIntersectionPoint(
    targetCenterX,
    targetCenterY,
    targetBounds.width,
    targetBounds.height,
    targetAngle
  );

  // Get React Flow positions
  const sourcePos = getPositionFromIntersection(
    sourceCenterX,
    sourceCenterY,
    sourceBounds.width,
    sourceBounds.height,
    sourceIntersection.x,
    sourceIntersection.y
  );

  const targetPos = getPositionFromIntersection(
    targetCenterX,
    targetCenterY,
    targetBounds.width,
    targetBounds.height,
    targetIntersection.x,
    targetIntersection.y
  );

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos,
    targetPos,
  };
};
