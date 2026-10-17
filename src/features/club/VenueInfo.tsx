import { Eyebrow } from "@/components/ui/Eyebrow";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { SectionCard } from "@/components/ui/SectionCard";
import type { Amenities } from "@/lib/types";
import { C } from "@/styles/tokens";
import { AMENITIES } from "./constants";

function CourtWatermark() {
  return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", right: -14, bottom: -22, width: 200, opacity: 0.14 }}>
      <rect x="10" y="10" width="180" height="100" rx="8" fill="none" stroke="white" strokeWidth="4" />
      <line x1="100" y1="10" x2="100" y2="110" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
      <rect x="10" y="40" width="45" height="40" fill="none" stroke="white" strokeWidth="3" />
      <rect x="145" y="40" width="45" height="40" fill="none" stroke="white" strokeWidth="3" />
    </svg>
  );
}

interface VenueInfoProps {
  venue: string;
  photo: string | null;
  amenities: Amenities;
  photoUploading: boolean;
  photoError: string;
  onUploadPhoto: (file: File) => void;
  onSetPhotoUrl: (url: string) => void;
  onToggleAmenity: (key: string) => void;
}

/* The venue banner (photo or court watermark) and its amenities. */
export function VenueInfo({
  venue,
  photo,
  amenities,
  photoUploading,
  photoError,
  onUploadPhoto,
  onSetPhotoUrl,
  onToggleAmenity,
}: VenueInfoProps) {
  return (
    <>
      <div
        style={{
          position: "relative",
          height: 140,
          borderRadius: 16,
          overflow: "hidden",
          background: photo ? `#000` : `linear-gradient(135deg, ${C.turf}, ${C.ink})`,
        }}
      >
        {photo ? (
          <img src={photo} alt={venue} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        ) : (
          <CourtWatermark />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 14,
          }}
        >
          <Eyebrow>{venue}</Eyebrow>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PhotoInput
              label={photo ? "사진 교체" : "사진 추가"}
              uploading={photoUploading}
              onFile={onUploadPhoto}
              onSetUrl={onSetPhotoUrl}
              dark
            />
          </div>
        </div>
      </div>

      {photoError && (
        <div
          style={{
            fontSize: 12,
            color: C.danger,
            background: "rgba(194,84,80,0.08)",
            border: `1px solid ${C.danger}`,
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          {photoError}
        </div>
      )}

      <SectionCard>
        <Eyebrow color={C.charcoal}>편의시설</Eyebrow>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {AMENITIES.map((a) => {
            const active = !!amenities[a.key];
            return (
              <button
                key={a.key}
                onClick={() => onToggleAmenity(a.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? C.turf : "rgba(0,0,0,0.15)"}`,
                  background: active ? C.turf : "transparent",
                  color: active ? "#fff" : "rgba(27,36,34,0.5)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {active ? "✓ " : ""}
                {a.label}
              </button>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
