import type { E8RootSystem, E8RootVector } from '../types';

/**
 * Generate the complete E8 root system
 * The E8 root system consists of 248 roots in 8-dimensional space
 * 
 * @returns E8RootSystem object containing all roots and properties
 */
export function generateE8RootSystem(): E8RootSystem {
  const roots: E8RootVector[] = [];
  
  // Generate all permutations of (±1,±1,0,0,0,0,0,0) - 112 roots
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      for (let s1 = -1; s1 <= 1; s1 += 2) {
        for (let s2 = -1; s2 <= 1; s2 += 2) {
          const coords = Array(8).fill(0);
          coords[i] = s1;
          coords[j] = s2;
          roots.push({
            coordinates: coords,
            index: roots.length
          });
        }
      }
    }
  }
  
  // Generate all permutations of (±1/2,±1/2,±1/2,±1/2,±1/2,±1/2,±1/2,±1/2) with even number of minus signs - 128 roots
  // This is a more efficient approach
  function generateHalfIntegerRoots() {
    const result: E8RootVector[] = [];
    // Generate all combinations with an even number of negative signs
    for (let i = 0; i < 256; i++) { // 2^8 = 256 combinations
      const signs = [];
      let negativeCount = 0;
      for (let j = 0; j < 8; j++) {
        const isNegative = (i >> j) & 1;
        signs.push(isNegative ? -1 : 1);
        if (isNegative) negativeCount++;
      }
      
      // Only include if even number of negative signs
      if (negativeCount % 2 === 0) {
        const coords = signs.map(s => s * 0.5);
        result.push({
          coordinates: coords,
          index: roots.length + result.length
        });
      }
    }
    return result;
  }
  
  const halfIntegerRoots = generateHalfIntegerRoots();
  roots.push(...halfIntegerRoots);
  
  return {
    roots: roots,
    dimension: 8,
    rank: 8,
    cartanMatrix: [
      [2, -1, 0, 0, 0, 0, 0, 0],
      [-1, 2, -1, 0, 0, 0, 0, 0],
      [0, -1, 2, -1, 0, 0, 0, 0],
      [0, 0, -1, 2, -1, 0, 0, 0],
      [0, 0, 0, -1, 2, -1, 0, 0],
      [0, 0, 0, 0, -1, 2, -1, 0],
      [0, 0, 0, 0, 0, -1, 2, -1],
      [0, 0, 0, 0, 0, 0, -1, 2]
    ],
    weylGroupOrder: 696729600 // Order of the Weyl group of E8
  };
}

/**
 * Project 8D E8 roots to 2D for visualization
 * 
 * @param roots E8 root vectors or array of coordinates
 * @param projectionMatrix 8x2 projection matrix
 * @returns 2D coordinates for visualization
 */
export function projectTo2D(roots: E8RootVector[] | number[][], projectionMatrix: number[][] = [[1, 0], [0, 1], [0.5, 0.5], [0.5, -0.5], [0, 0], [0, 0], [0, 0], [0, 0]]): number[][] {
  // Convert to coordinates array if needed
  const coordinates = Array.isArray(roots[0]) 
    ? roots as number[][] 
    : (roots as E8RootVector[]).map(root => root.coordinates);
    
  return coordinates.map(coords => {
    const projected: number[] = [0, 0];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 8; j++) {
        projected[i] += coords[j] * projectionMatrix[j][i];
      }
    }
    return projected;
  });
}

/**
 * Project 8D E8 roots to 3D for visualization
 * 
 * @param roots E8 root vectors
 * @param projectionMatrix 8x3 projection matrix
 * @returns 3D coordinates for visualization
 */
export function projectTo3D(roots: E8RootVector[], projectionMatrix: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [0, 0, 0], [0, 0, 0]]): number[][] {
  return roots.map(root => {
    const projected: number[] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        projected[i] += root.coordinates[j] * projectionMatrix[j][i];
      }
    }
    return projected;
  });
}