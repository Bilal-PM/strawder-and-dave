/** Memoised drawing components for trains. */
import React, { memo } from "react";
import type { TrainClass } from "@/domain/types";
import { usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { paintScale, paintSide, paintThumb, sideBox, THUMB_H } from "./draw";
import { classLivery, toDraw, type Livery } from "./model";

const liveryKey = (L: Livery) => [L.body, L.stripe, L.name, L.number, L.logo, L.initials, L.img ? L.img.length : 0, L.noMore].join("|");

/** Side view in a 640 x 200 box, on track. */
export const SideView = memo(function SideView({ train, livery, label }: { train: TrainClass; livery?: Livery; label?: string }) {
  const pal = usePal();
  const L = livery ?? { ...classLivery(train), noMore: false };
  return <Sketch w={640} h={sideBox(toDraw(train)).h} pal={pal} deps={[train.id, liveryKey(L)]} paint={(p) => paintSide(p, toDraw(train), L)} accessibilityLabel={label ?? `Side view of the ${train.name}, drawn to scale`} />;
});

/** Library thumbnail: class colours, no extra labels. */
export const Thumb = memo(function Thumb({ train }: { train: TrainClass }) {
  const pal = usePal();
  return <Sketch w={640} h={THUMB_H} pal={pal} deps={[train.id, train.body, train.stripe]} paint={(p) => paintThumb(p, toDraw(train), { ...classLivery(train), noMore: true })} />;
});

/** To-scale strip next to a 1.75 m person. */
export const ScaleStrip = memo(function ScaleStrip({ train }: { train: TrainClass }) {
  const pal = usePal();
  const { c } = useTheme();
  return <Sketch w={640} h={120} pal={pal} deps={[train.id, c.ppe]} paint={(p) => paintScale(p, toDraw(train), classLivery(train), c.ppe)} accessibilityLabel={`The ${train.name} drawn to scale next to a person 1.75 metres tall, with a 10 metre scale bar`} />;
});
