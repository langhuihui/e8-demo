export interface E8RootVector {
  coordinates: number[];
  index: number;
}

export interface E8RootSystem {
  roots: E8RootVector[];
  dimension: number;
  rank: number;
  cartanMatrix: number[][];
  weylGroupOrder: number;
}

export interface VisualizationSettings {
  projectionType: '2D' | '3D';
  dimensionReduction: number[];
  displayOptions: {
    showLabels: boolean;
    colorScheme: string;
    pointSize: number;
  };
}