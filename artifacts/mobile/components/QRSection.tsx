import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Defs, G, Rect, Svg } from "react-native-svg";

interface QRSectionProps {
  value: string;
  size?: number;
  label?: string;
}

function generateQRMatrix(value: string, size: number): boolean[][] {
  const data = value + "|" + size;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    matrix[row] = [];
    for (let col = 0; col < size; col++) {
      if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
        matrix[row][col] = true;
      } else if (row < 8 && col < 8) {
        matrix[row][col] = row === 0 || row === 6 || col === 0 || col === 6 || (row <= 6 && col <= 6 && (row + col) % 2 === 0);
      } else if (row < 8 && col >= size - 8) {
        matrix[row][col] = row === 0 || row === 6 || col === size - 1 || col === size - 7;
      } else if (row >= size - 8 && col < 8) {
        matrix[row][col] = row === size - 1 || row === size - 7 || col === 0 || col === 6;
      } else {
        const pseudoRandom = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
        matrix[row][col] = Math.abs(pseudoRandom % 1) > 0.5;
      }
    }
  }
  return matrix;
}

export default function QRSection({ value, size = 9, label }: QRSectionProps) {
  const matrix = generateQRMatrix(value, size);
  const cellSize = 5;
  const padding = 8;
  const totalSize = size * cellSize + padding * 2;
  const visualSize = size * cellSize;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.qrWrapper}>
        <Svg width={totalSize} height={totalSize} viewBox={`0 0 ${totalSize} ${totalSize}`}>
          <Defs />
          <G>
            {matrix.map((row, rowIdx) =>
              row.map((cell, colIdx) =>
                cell ? (
                  <Rect
                    key={`${rowIdx}-${colIdx}`}
                    x={padding + colIdx * cellSize}
                    y={padding + rowIdx * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="#FFFFFF"
                    rx={0.5}
                  />
                ) : null,
              ),
            )}
          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  qrWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 6,
  },
});
