export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type ManualLocation = Coordinate & {
  label: string;
  source: 'manual';
};

export type LocationStatus = 'loading' | 'requesting' | 'ready' | 'denied' | 'error';
export type LocationSource = 'default' | 'device' | 'manual';
