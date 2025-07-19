export interface BitcoinTransaction {
  hash: string;
  value: number;  // in satoshis
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
    country?: string;
  };
}

export interface GlobePoint {
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  radius: number;
  value: number;
  __globeObjectId?: string; // Required by globe.gl for object tracking
} 