interface LocationInput {
    locationName: string;
    city: string;
    state: string;
    country: string;
}

interface Coordinates {
    longitude: number;
    latitude:  number;
}

interface Location extends LocationInput, Coordinates {
  locationId: number;
  createdAt: string;
  updatedAt: string;
}