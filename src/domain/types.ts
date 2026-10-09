import type { LocationInput } from './validation';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends LocationInput, Coordinates {
  locationId: string; 
  createdAt: string;
  updatedAt: string;
}