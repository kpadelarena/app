export function EmptyHint({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "16px",
        borderRadius: 10,
        border: "1px dashed rgba(0,0,0,0.15)",
        fontSize: 13,
        color: "rgba(27,36,34,0.55)",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
