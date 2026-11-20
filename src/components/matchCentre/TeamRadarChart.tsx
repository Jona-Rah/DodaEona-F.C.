import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import {
  RADAR_AXES,
  type RadarAxisKey,
  type TeamRadarComparisonProfile,
} from '../../utils/teamCompareMetrics';

interface TeamRadarChartProps {
  profileA: TeamRadarComparisonProfile;
  profileB: TeamRadarComparisonProfile;
  colorA: string;
  fillA: string;
  colorB: string;
  fillB: string;
  activeAxis: RadarAxisKey | null;
  onHoverAxis: (axis: RadarAxisKey | null) => void;
  isLightTheme: boolean;
}

const SVG_WIDTH = 480;
const SVG_HEIGHT = 420;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;
const RADIUS = 136;
const RING_LEVELS = [25, 50, 75, 100];

export const TeamRadarChart: React.FC<TeamRadarChartProps> = ({
  profileA,
  profileB,
  colorA,
  fillA,
  colorB,
  fillB,
  activeAxis,
  onHoverAxis,
  isLightTheme,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathsInitializedRef = useRef(false);

  const axisAngles = useMemo(() => {
    const step = (Math.PI * 2) / RADAR_AXES.length;
    return RADAR_AXES.map((axis, idx) => ({
      ...axis,
      index: idx,
      angle: idx * step,
    }));
  }, []);

  // Build & animate D3 radar layers whenever profiles, colors, theme, or active axis change
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, RADIUS]);

    const gridStroke = isLightTheme ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.10)';
    const outerGridStroke = isLightTheme ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.20)';
    const spokeStroke = isLightTheme ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.13)';
    const tickFill = isLightTheme ? '#64748B' : '#94A3B8';
    const dotStroke = isLightTheme ? '#FFFFFF' : '#080D16';

    // Ensure root static structure exists once
    let root = svg.select<SVGGElement>('g.radar-root');
    if (root.empty()) {
      root = svg
        .append('g')
        .attr('class', 'radar-root')
        .attr('transform', `translate(${CENTER_X}, ${CENTER_Y})`);

      root.append('g').attr('class', 'radar-grid');
      root.append('g').attr('class', 'radar-axes');
      root.append('g').attr('class', 'radar-polygons');
      root.append('g').attr('class', 'radar-vertices');
      root.append('g').attr('class', 'radar-hit-targets');
    }

    // 1. Concentric rings + diamond polygon grid guides
    const gridLayer = root.select<SVGGElement>('g.radar-grid');
    gridLayer.selectAll('*').remove();

    const webLine = d3
      .lineRadial<number>()
      .angle((_, i) => axisAngles[i % axisAngles.length].angle)
      .radius((level) => rScale(level))
      .curve(d3.curveLinearClosed);

    RING_LEVELS.forEach((level) => {
      const r = rScale(level);
      // Circular subtle ring
      gridLayer
        .append('circle')
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', level === 100 ? outerGridStroke : gridStroke)
        .attr('stroke-width', level === 100 ? 1.25 : 1)
        .attr('stroke-dasharray', level === 100 ? 'none' : '3,3');

      // Subtle connecting diamond guide along exact axis values
      gridLayer
        .append('path')
        .datum(axisAngles.map(() => level))
        .attr('d', webLine)
        .attr('fill', 'none')
        .attr('stroke', isLightTheme ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)')
        .attr('stroke-width', 1);

      // Ring numeric label placed cleanly along 45-degree diagonal to avoid Attack axis collision
      const [lx, ly] = d3.pointRadial(Math.PI / 4, r);
      gridLayer
        .append('text')
        .attr('x', lx + 4)
        .attr('y', ly - 2)
        .attr('fill', tickFill)
        .attr('font-size', '9.5px')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .attr('font-weight', '600')
        .text(String(level));
    });

    // 2. Spokes
    const axesLayer = root.select<SVGGElement>('g.radar-axes');
    axesLayer.selectAll('*').remove();

    axisAngles.forEach((ax) => {
      const [x2, y2] = d3.pointRadial(ax.angle, RADIUS);
      const isActive = activeAxis === ax.key;
      axesLayer
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr(
          'stroke',
          isActive
            ? isLightTheme
              ? 'rgba(8, 145, 178, 0.7)'
              : 'rgba(122, 219, 240, 0.75)'
            : spokeStroke
        )
        .attr('stroke-width', isActive ? 2 : 1);
    });

    // 3. Radial polygon paths for Team A and Team B
    const polyLayer = root.select<SVGGElement>('g.radar-polygons');
    const radialLine = d3
      .lineRadial<{ angle: number; score: number }>()
      .angle((d) => d.angle)
      .radius((d) => rScale(d.score))
      .curve(d3.curveLinearClosed);

    const dataA = axisAngles.map((ax) => ({
      key: ax.key,
      angle: ax.angle,
      score: profileA.axes[ax.key].score,
    }));
    const dataB = axisAngles.map((ax) => ({
      key: ax.key,
      angle: ax.angle,
      score: profileB.axes[ax.key].score,
    }));

    const zeroData = axisAngles.map((ax) => ({
      key: ax.key,
      angle: ax.angle,
      score: 0,
    }));

    const renderPolygon = (
      className: string,
      points: typeof dataA,
      stroke: string,
      fill: string,
      dash?: string
    ) => {
      let path = polyLayer.select<SVGPathElement>(`path.${className}`);
      const isNew = path.empty();
      if (isNew) {
        path = polyLayer
          .append('path')
          .attr('class', className)
          .attr('d', radialLine(pathsInitializedRef.current ? points : zeroData) || '')
          .attr('stroke-linejoin', 'round');
      }

      path
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', dash || 'none')
        .transition()
        .duration(420)
        .ease(d3.easeCubicOut)
        .attr('d', radialLine(points) || '');
    };

    renderPolygon('radar-poly-a', dataA, colorA, fillA);
    renderPolygon('radar-poly-b', dataB, colorB, fillB);
    pathsInitializedRef.current = true;

    // 4. Vertex Circles
    const verticesLayer = root.select<SVGGElement>('g.radar-vertices');
    verticesLayer.selectAll('*').remove();

    const drawDots = (points: typeof dataA, stroke: string, teamTag: 'a' | 'b') => {
      points.forEach((pt) => {
        const [cx, cy] = d3.pointRadial(pt.angle, rScale(pt.score));
        const isActive = activeAxis === pt.key;
        verticesLayer
          .append('circle')
          .attr('class', `vertex-${teamTag}-${pt.key}`)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', isActive ? 6.5 : 4.5)
          .attr('fill', stroke)
          .attr('stroke', dotStroke)
          .attr('stroke-width', isActive ? 2.2 : 1.6)
          .style('pointer-events', 'none');
      });
    };

    drawDots(dataA, colorA, 'a');
    drawDots(dataB, colorB, 'b');

    // 5. Interactive hit wedges per axis
    const hitsLayer = root.select<SVGGElement>('g.radar-hit-targets');
    hitsLayer.selectAll('*').remove();

    axisAngles.forEach((ax) => {
      const arcGen = d3
        .arc<unknown>()
        .innerRadius(12)
        .outerRadius(RADIUS + 42)
        .startAngle(ax.angle - Math.PI / 4)
        .endAngle(ax.angle + Math.PI / 4);

      hitsLayer
        .append('path')
        .attr('d', arcGen({}) || '')
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', () => onHoverAxis(ax.key))
        .on('mouseleave', () => onHoverAxis(null))
        .on('click', () => onHoverAxis(activeAxis === ax.key ? null : ax.key));
    });
  }, [
    axisAngles,
    profileA,
    profileB,
    colorA,
    fillA,
    colorB,
    fillB,
    activeAxis,
    onHoverAxis,
    isLightTheme,
  ]);

  // SVG Axis Label positions (rendered cleanly via React SVG text for crisp accessibility & styling)
  const axisLabelPositions = useMemo(() => {
    const labelRadius = RADIUS + 32;
    return axisAngles.map((ax) => {
      const [x, y] = d3.pointRadial(ax.angle, labelRadius);
      const valA = profileA.axes[ax.key].score;
      const valB = profileB.axes[ax.key].score;
      let textAnchor: 'middle' | 'start' | 'end' = 'middle';
      let dx = 0;
      let dy = 0;
      if (ax.key === 'attack') {
        dy = -10;
      } else if (ax.key === 'midfield') {
        dy = 14;
      } else if (ax.key === 'defense') {
        textAnchor = 'start';
        dx = 10;
        dy = -2;
      } else if (ax.key === 'form') {
        textAnchor = 'end';
        dx = -10;
        dy = -2;
      }
      return {
        ...ax,
        x: CENTER_X + x + dx,
        y: CENTER_Y + y + dy,
        textAnchor,
        valA,
        valB,
      };
    });
  }, [axisAngles, profileA, profileB]);

  const activePointInfo = activeAxis
    ? {
        label: profileA.axes[activeAxis].label,
        a: profileA.axes[activeAxis],
        b: profileB.axes[activeAxis],
        delta: profileA.axes[activeAxis].score - profileB.axes[activeAxis].score,
      }
    : null;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto max-h-[410px] select-none overflow-visible"
        role="img"
        aria-label={`Radar chart comparing ${profileA.team.shortName} and ${profileB.team.shortName} across Attack, Defense, Midfield, and Form`}
      />

      {/* Crisp Interactive Axis Labels Overlay SVG Layer */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="pointer-events-none absolute inset-0 w-full h-full max-h-[410px] overflow-visible"
        aria-hidden="true"
      >
        {axisLabelPositions.map((ax) => {
          const isFocused = activeAxis === ax.key;
          return (
            <g key={ax.key} transform={`translate(${ax.x}, ${ax.y})`}>
              <text
                textAnchor={ax.textAnchor}
                className="font-mono uppercase"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  fill: isFocused
                    ? isLightTheme
                      ? '#0891B2'
                      : '#7ADBF0'
                    : isLightTheme
                    ? '#0F172A'
                    : '#F1F5F9',
                }}
              >
                {ax.label}
              </text>
              <text
                y={15}
                textAnchor={ax.textAnchor}
                className="font-mono tabular-nums"
                style={{ fontSize: '11.5px', fontWeight: 700 }}
              >
                <tspan fill={colorA}>{ax.valA}</tspan>
                <tspan fill={isLightTheme ? '#94A3B8' : '#64748B'}> · </tspan>
                <tspan fill={colorB}>{ax.valB}</tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Focused Axis Live Inspection Strip */}
      <div className="mt-2 pt-3 border-t border-white/[0.07] light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs min-h-[42px]">
        {activePointInfo ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 font-bold">
                {activePointInfo.label} FOCUS
              </span>
              <span className="text-slate-400 light:text-slate-500">·</span>
              <span className="text-slate-300 light:text-slate-700 truncate">
                {activePointInfo.a.secondaryDetail || activePointInfo.a.detail}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
              <span className="font-bold" style={{ color: colorA }}>
                {profileA.team.code || profileA.team.shortName} {activePointInfo.a.score}
              </span>
              <span className="text-slate-500">vs</span>
              <span className="font-bold" style={{ color: colorB }}>
                {profileB.team.code || profileB.team.shortName} {activePointInfo.b.score}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  activePointInfo.delta > 0
                    ? 'text-emerald-400 light:text-emerald-700'
                    : activePointInfo.delta < 0
                    ? 'text-amber-400 light:text-amber-700'
                    : 'text-slate-400'
                }`}
              >
                {activePointInfo.delta > 0
                  ? `+${activePointInfo.delta} ${profileA.team.code}`
                  : activePointInfo.delta < 0
                  ? `+${Math.abs(activePointInfo.delta)} ${profileB.team.code}`
                  : 'EVEN'}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full text-[11px] text-slate-400 light:text-slate-600">
            <span>Hover or tap any radar quadrant to inspect Attack, Defense, Midfield, or Form.</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 tabular-nums">
              SCALE 0–100 · D3 RADIAL
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
