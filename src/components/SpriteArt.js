import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

// Hand-drawn SVG costumes, all on a 100x100 box and facing right (direction 90),
// so rotating by (direction - 90) points them the right way.

const Cat = () => (
  <G strokeLinejoin="round" strokeLinecap="round">
    <Path d="M24 66c-12-2-17-12-13-22" fill="none" stroke="#C47A12" strokeWidth={7} />
    <Path d="M24 66c-12-2-17-12-13-22" fill="none" stroke="#FFAB19" strokeWidth={4} />
    <Rect x={30} y={74} width={9} height={16} rx={4.5} fill="#FFAB19" stroke="#C47A12" strokeWidth={2} />
    <Rect x={54} y={74} width={9} height={16} rx={4.5} fill="#FFAB19" stroke="#C47A12" strokeWidth={2} />
    <Ellipse cx={45} cy={66} rx={24} ry={16} fill="#FFAB19" stroke="#C47A12" strokeWidth={2.5} />
    <Ellipse cx={48} cy={70} rx={12} ry={8} fill="#FFF3DE" />
    <Path d="M51 26 55 8l12 13z" fill="#FFAB19" stroke="#C47A12" strokeWidth={2.5} />
    <Path d="M73 21 85 9l1 19z" fill="#FFAB19" stroke="#C47A12" strokeWidth={2.5} />
    <Circle cx={68} cy={38} r={20} fill="#FFAB19" stroke="#C47A12" strokeWidth={2.5} />
    <Ellipse cx={74} cy={46} rx={11} ry={7.5} fill="#FFF3DE" />
    <Ellipse cx={64} cy={34} rx={3.6} ry={4.6} fill="#182230" />
    <Ellipse cx={78} cy={34} rx={3.6} ry={4.6} fill="#182230" />
    <Circle cx={65.2} cy={32.6} r={1.3} fill="#fff" />
    <Circle cx={79.2} cy={32.6} r={1.3} fill="#fff" />
    <Path d="M73 42.5h4l-2 2.5z" fill="#E5576B" stroke="#E5576B" strokeWidth={1.5} />
    <Path d="M71 48c2 2 6 2 8 0" fill="none" stroke="#7A4A0E" strokeWidth={1.8} />
    <Path d="M83 44h10M83 47.5l9 2.5" stroke="#7A4A0E" strokeWidth={1.4} />
  </G>
);

const Dog = () => (
  <G strokeLinejoin="round" strokeLinecap="round">
    <Path d="M22 60c-8-4-10-12-6-18" fill="none" stroke="#7A4A2A" strokeWidth={6} />
    <Rect x={28} y={72} width={10} height={18} rx={5} fill="#C98B52" stroke="#7A4A2A" strokeWidth={2} />
    <Rect x={54} y={72} width={10} height={18} rx={5} fill="#C98B52" stroke="#7A4A2A" strokeWidth={2} />
    <Ellipse cx={45} cy={64} rx={25} ry={16} fill="#C98B52" stroke="#7A4A2A" strokeWidth={2.5} />
    <Ellipse cx={40} cy={60} rx={9} ry={7} fill="#A86C3A" />
    <Circle cx={68} cy={38} r={19} fill="#C98B52" stroke="#7A4A2A" strokeWidth={2.5} />
    <Path d="M57 24c-9 2-12 16-6 24 4-6 6-14 6-24z" fill="#7A4A2A" />
    <Ellipse cx={81} cy={46} rx={12} ry={9} fill="#F1D3B0" stroke="#7A4A2A" strokeWidth={2} />
    <Ellipse cx={90} cy={42.5} rx={4} ry={3.2} fill="#182230" />
    <Circle cx={71} cy={33} r={3.6} fill="#182230" />
    <Circle cx={72.2} cy={31.8} r={1.2} fill="#fff" />
    <Path d="M79 51c3 2.5 7 2.5 9 0" fill="none" stroke="#7A4A2A" strokeWidth={1.8} />
    <Path d="M52 52c6 4 14 4 20 0" fill="none" stroke="#E5576B" strokeWidth={4} />
    <Circle cx={62} cy={56} r={2.6} fill="#FFD43B" stroke="#C47A12" strokeWidth={1} />
  </G>
);

const Robot = () => (
  <G strokeLinejoin="round" strokeLinecap="round">
    <Path d="M50 14V6" stroke="#475467" strokeWidth={2.5} />
    <Circle cx={50} cy={5} r={3.5} fill="#59C059" stroke="#2F7D32" strokeWidth={1.5} />
    <Rect x={28} y={14} width={44} height={34} rx={10} fill="#D0D5DD" stroke="#475467" strokeWidth={2.5} />
    <Rect x={34} y={20} width={32} height={20} rx={6} fill="#182230" />
    <Circle cx={44} cy={30} r={3.5} fill="#4C97FF" />
    <Circle cx={58} cy={30} r={3.5} fill="#4C97FF" />
    <Rect x={30} y={50} width={40} height={30} rx={8} fill="#98A2B3" stroke="#475467" strokeWidth={2.5} />
    <Rect x={42} y={57} width={16} height={10} rx={3} fill="#FFAB19" />
    <Path d="M30 58H18v12M70 58h12v12" fill="none" stroke="#475467" strokeWidth={4} />
    <Rect x={35} y={80} width={10} height={12} rx={3} fill="#475467" />
    <Rect x={55} y={80} width={10} height={12} rx={3} fill="#475467" />
  </G>
);

const ART = { cat: Cat, dog: Dog, robot: Robot };

export default function SpriteArt({ costume = "cat", size = 40 }) {
  const Art = ART[costume] || Cat;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" pointerEvents="none">
      <Art />
    </Svg>
  );
}
