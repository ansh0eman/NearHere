export type ActivityKind = 'walk' | 'coffee' | 'sport';

export type Activity = {
  id: string;
  kind: ActivityKind;
  emoji: string;
  title: string;
  description: string;
  startsIn: string;
  distance: string;
  going: number;
  capacity: number;
  latitudeOffset: number;
  longitudeOffset: number;
};

export type ActivityFilter = 'all' | ActivityKind;
