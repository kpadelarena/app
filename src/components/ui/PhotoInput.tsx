import { useState, type CSSProperties } from "react";
import { C } from "@/styles/tokens";

interface PhotoUploadFieldProps {
  label: string;
  onFile: (file: File) => void;
  uploading?: boolean;
  style?: CSSProperties;
}

function PhotoUploadField({ label, onFile, uploading, style }: PhotoUploadFieldProps) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.4)",
        background: "rgba(16,21,26,0.5)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        cursor: uploading ? "wait" : "pointer",
        overflow: "hidden",
        ...style,
      }}
    >
      {uploading ? "업로드 중..." : label}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: uploading ? "wait" : "pointer",
        }}
      />
    </label>
  );
}

/* PhotoInput — file-picker button + a guaranteed-to-work URL fallback,
   since native file dialogs can be unreliable inside sandboxed frames. */
interface PhotoInputProps {
  label: string;
  uploading?: boolean;
  onFile: (file: File) => void;
  onSetUrl: (url: string) => void;
  dark?: boolean;
}

export function PhotoInput({ label, uploading, onFile, onSetUrl, dark }: PhotoInputProps) {
  const [showUrl, setShowUrl] = useState(false);
  const [urlVal, setUrlVal] = useState("");
  const linkColor = dark ? "rgba(255,255,255,0.75)" : "rgba(27,36,34,0.55)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <PhotoUploadField
          label={label}
          uploading={uploading}
          onFile={onFile}
          style={
            dark ? undefined : { border: "1px solid rgba(0,0,0,0.15)", background: "transparent", color: C.charcoal }
          }
        />
        <button
          type="button"
          onClick={() => setShowUrl((s) => !s)}
          style={{
            background: "none",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: 11,
            color: linkColor,
          }}
        >
          {showUrl ? "취소" : "URL로 추가"}
        </button>
      </div>
      {showUrl && (
        <div style={{ display: "flex", gap: 4, width: "100%" }}>
          <input
            value={urlVal}
            onChange={(e) => setUrlVal(e.target.value)}
            placeholder="이미지 URL 붙여넣기"
            style={{
              flex: 1,
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />
          <button
            onClick={() => {
              if (urlVal.trim()) {
                onSetUrl(urlVal.trim());
                setUrlVal("");
                setShowUrl(false);
              }
            }}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              background: C.turf,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}
