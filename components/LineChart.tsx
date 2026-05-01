import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { AppText } from '@/components/Text';
import { colors, spacing, radii } from '@/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DataPoint = {
  label: string;
  value: number;
};

export type LineChartProps = {
  data: DataPoint[];
  width: number;
  height?: number;
  color?: string;
};

// ─── Padding constants ────────────────────────────────────────────────────────

const PAD_TOP = 24;
const PAD_RIGHT = 16;
const PAD_BOTTOM = 28;
const PAD_LEFT = 36;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcIndex(
  touchX: number,
  dataLen: number,
  innerW: number,
  padLeft: number,
): number {
  const ratio = (touchX - padLeft) / innerW;
  return Math.max(0, Math.min(dataLen - 1, Math.round(ratio * (dataLen - 1))));
}

function getXLabelIndices(count: number): number[] {
  if (count <= 1) return count === 1 ? [0] : [];
  if (count <= 6) return Array.from({ length: count }, (_, i) => i);

  // Always include first and last, fill up to 6 total with evenly spaced middle ones
  const result: number[] = [0];
  const middleCount = 4; // 6 total - first - last = 4 middle slots
  for (let i = 1; i <= middleCount; i++) {
    result.push(Math.round((i * (count - 1)) / (middleCount + 1)));
  }
  result.push(count - 1);
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LineChart({
  data,
  width,
  height = 160,
  color = colors.accent,
}: LineChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const isActive = useSharedValue<boolean>(false);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { width, height }]}>
        <AppText variant="body" color={colors.inkFaint}>
          No data yet
        </AppText>
      </View>
    );
  }

  // ── Derived geometry ─────────────────────────────────────────────────────

  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  function xOf(i: number): number {
    if (data.length === 1) return PAD_LEFT + innerW / 2;
    return PAD_LEFT + (i / (data.length - 1)) * innerW;
  }

  function yOf(v: number): number {
    return PAD_TOP + innerH - (v / maxVal) * innerH;
  }

  // ── SVG path strings ─────────────────────────────────────────────────────

  // Line path: M first, L each subsequent point
  const linePath =
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(2)},${yOf(d.value).toFixed(2)}`)
      .join(' ');

  // Area fill path: down the right side, across the bottom, back up the left
  const firstX = xOf(0).toFixed(2);
  const lastX = xOf(data.length - 1).toFixed(2);
  const bottomY = (PAD_TOP + innerH).toFixed(2);
  const areaPath =
    `M ${firstX},${yOf(data[0].value).toFixed(2)} ` +
    data
      .slice(1)
      .map((d, i) => `L ${xOf(i + 1).toFixed(2)},${yOf(d.value).toFixed(2)}`)
      .join(' ') +
    ` L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

  // ── Y-axis grid ──────────────────────────────────────────────────────────

  const gridFractions = [0, 1 / 3, 2 / 3, 1];
  const gridLines = gridFractions.map((f) => {
    const val = Math.round(maxVal * f);
    const y = yOf(val);
    return { y, val };
  });

  // ── X-axis label indices ─────────────────────────────────────────────────

  const xLabelIndices = getXLabelIndices(data.length);

  // ── Gesture (native only) ─────────────────────────────────────────────────

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart((e) => {
      isActive.value = true;
      runOnJS(setActiveIdx)(calcIndex(e.x, data.length, innerW, PAD_LEFT));
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (isActive.value) {
        runOnJS(setActiveIdx)(calcIndex(e.x, data.length, innerW, PAD_LEFT));
      }
    })
    .onEnd(() => {
      isActive.value = false;
      runOnJS(setActiveIdx)(null);
    })
    .onFinalize(() => {
      isActive.value = false;
      runOnJS(setActiveIdx)(null);
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  // ── Tooltip geometry ─────────────────────────────────────────────────────

  let tooltipLeft: number | null = null;
  let activeX: number | null = null;
  if (activeIdx !== null) {
    activeX = xOf(activeIdx);
    const rawLeft = activeX - 40; // center 80px-wide tooltip
    tooltipLeft = Math.max(8, Math.min(rawLeft, width - 80));
  }

  // ── Gradient fill color ──────────────────────────────────────────────────

  // Parse the color to build rgba at 15% opacity
  // color might be hex or rgba already; for the gradient stop we use opacity prop
  const gradientStopColor = color;

  // ── Web dot handler ───────────────────────────────────────────────────────

  function handleDotPress(i: number) {
    setActiveIdx((prev) => (prev === i ? null : i));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ position: 'relative', width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="lgChartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={gradientStopColor}
              stopOpacity="0.15"
            />
            <Stop
              offset="1"
              stopColor={gradientStopColor}
              stopOpacity="0"
            />
          </SvgGradient>
        </Defs>

        {/* Y-axis grid lines + labels */}
        {gridLines.map(({ y, val }) => (
          <React.Fragment key={`grid-${val}`}>
            <Line
              x1={PAD_LEFT.toFixed(2)}
              y1={y.toFixed(2)}
              x2={(width - PAD_RIGHT).toFixed(2)}
              y2={y.toFixed(2)}
              stroke={colors.rule}
              strokeWidth="1"
            />
            <SvgText
              x={(PAD_LEFT - 4).toFixed(2)}
              y={(y + 3).toFixed(2)}
              fontSize="9"
              fill={colors.inkFaint}
              textAnchor="end"
            >
              {val}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#lgChartFill)" />

        {/* Line */}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Dots */}
        {data.map((d, i) => {
          const cx = xOf(i);
          const cy = yOf(d.value);
          const isActivePoint = activeIdx === i;

          if (Platform.OS === 'web') {
            return (
              <Circle
                key={`dot-${i}`}
                cx={cx.toFixed(2)}
                cy={cy.toFixed(2)}
                r={isActivePoint ? 5.5 : 3.5}
                fill={isActivePoint ? color : colors.white}
                stroke={isActivePoint ? colors.white : color}
                strokeWidth="2"
                // @ts-ignore — web-only event
                onPress={() => handleDotPress(i)}
              />
            );
          }

          return (
            <Circle
              key={`dot-${i}`}
              cx={cx.toFixed(2)}
              cy={cy.toFixed(2)}
              r={isActivePoint ? 5.5 : 3.5}
              fill={isActivePoint ? color : colors.white}
              stroke={isActivePoint ? colors.white : color}
              strokeWidth="2"
            />
          );
        })}

        {/* Active vertical dashed line */}
        {activeIdx !== null && activeX !== null && (
          <Line
            x1={activeX.toFixed(2)}
            y1={PAD_TOP.toFixed(2)}
            x2={activeX.toFixed(2)}
            y2={(PAD_TOP + innerH).toFixed(2)}
            stroke={color}
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}

        {/* X-axis labels */}
        {xLabelIndices.map((i) => (
          <SvgText
            key={`xlabel-${i}`}
            x={xOf(i).toFixed(2)}
            y={(height - 4).toFixed(2)}
            fontSize="9"
            fill={colors.inkFaint}
            textAnchor="middle"
          >
            {data[i].label}
          </SvgText>
        ))}
      </Svg>

      {/* Native: transparent gesture overlay */}
      {Platform.OS !== 'web' && (
        <GestureDetector gesture={composed}>
          <Animated.View style={StyleSheet.absoluteFill} />
        </GestureDetector>
      )}

      {/* Tooltip — rendered last so it sits above SVG and overlay */}
      {activeIdx !== null && tooltipLeft !== null && (
        <View style={[styles.tooltip, { left: tooltipLeft, top: 0 }]}>
          <AppText variant="bodySmall" color={colors.white} style={styles.tooltipValue}>
            {data[activeIdx].value} like{data[activeIdx].value !== 1 ? 's' : ''}
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.7)">
            {data[activeIdx].label}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    zIndex: 10,
  },
  tooltipValue: {
    fontWeight: 'bold',
  },
});
