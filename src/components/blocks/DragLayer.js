import React, { useRef, useState } from "react";
import { View } from "react-native";
import { useDrag } from "../../dnd/dragStore";
import { shadow } from "../../theme";
import { BlockView, useDraggedBlock } from "./BlockView";

// Overlay on top of everything that draws the block you're dragging. Touches go
// straight through it. The finger position is in window coords, but on Android this
// view can start below the status bar, so we measure our own offset and subtract it.
export default function DragLayer() {
  const drag = useDrag((d) => (d.payload ? d : null));
  const block = useDraggedBlock();
  const ref = useRef(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const onLayout = () => {
    if (ref.current && ref.current.measureInWindow) {
      ref.current.measureInWindow((x, y) => {
        setOrigin((o) => (o.x === (x || 0) && o.y === (y || 0) ? o : { x: x || 0, y: y || 0 }));
      });
    }
  };

  const deleting = drag && drag.target && drag.target.type === "delete";
  let opacity = "opacity-75";
  if (deleting) opacity = "opacity-50";
  else if (drag && drag.target) opacity = "opacity-[0.97]";

  return (
    <View ref={ref} collapsable={false} pointerEvents="none" className="absolute inset-0" onLayout={onLayout}>
      {drag && block && (
        <View
          className={`absolute left-0 top-0 ${opacity}`}
          style={[
            shadow.lg,
            {
              transform: [
                { translateX: drag.x - drag.offsetX - origin.x },
                { translateY: drag.y - drag.offsetY - origin.y },
                { rotate: "2deg" },
              ],
            },
          ]}
        >
          <BlockView block={block} spriteId={drag.payload.spriteId} mode="ghost" />
        </View>
      )}
    </View>
  );
}
