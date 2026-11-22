import ExifReader from "exifreader";

export interface ParsedExif {
  has_gps: boolean;
  has_timestamp: boolean;
  latitude?: number;
  longitude?: number;
  dateTime?: string;
  make?: string;
  model?: string;
}

export async function parseImageExif(file: File): Promise<ParsedExif> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (tags.GPSLatitude && tags.GPSLongitude) {
      const latVal = tags.GPSLatitude.description;
      const lonVal = tags.GPSLongitude.description;
      latitude = parseFloat(latVal);
      longitude = parseFloat(lonVal);
      
      if (tags.GPSLatitudeRef && String(tags.GPSLatitudeRef.value).startsWith("S")) {
        latitude = -latitude;
      }
      if (tags.GPSLongitudeRef && String(tags.GPSLongitudeRef.value).startsWith("W")) {
        longitude = -longitude;
      }
    }

    const dateTime = tags.DateTimeOriginal?.description || tags.DateTime?.description;
    const make = tags.Make?.description;
    const model = tags.Model?.description;

    return {
      has_gps: Boolean(latitude && longitude),
      has_timestamp: Boolean(dateTime),
      latitude,
      longitude,
      dateTime,
      make,
      model,
    };
  } catch (err) {
    return {
      has_gps: false,
      has_timestamp: false,
    };
  }
}
