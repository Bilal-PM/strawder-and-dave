/* Minimal stand-in for react-native-reanimated in tests: animations resolve to their final value immediately. */
const RN = require("react-native");
const anim = () => { const b = { duration: () => b, delay: () => b, springify: () => b, damping: () => b, easing: () => b, withInitialValues: () => b, reduceMotion: () => b }; return b; };
const entering = ["FadeIn", "FadeInDown", "FadeInUp", "FadeInRight", "FadeOut", "FlipInXUp", "SlideInDown", "SlideOutDown", "ZoomIn", "ZoomOut"];
const Animated = { View: RN.View, Text: RN.Text, ScrollView: RN.ScrollView, Image: RN.Image, createAnimatedComponent: (c) => c };
const m = {
  __esModule: true, default: Animated, ...Animated,
  useSharedValue: (v) => ({ value: v, get: () => v, set: () => {} }),
  useAnimatedStyle: (fn) => { try { return fn(); } catch { return {}; } },
  useAnimatedProps: (fn) => { try { return fn(); } catch { return {}; } },
  useDerivedValue: (fn) => ({ value: fn() }),
  useReducedMotion: () => true,
  withTiming: (v) => v, withSpring: (v) => v, withDelay: (_d, v) => v, withRepeat: (v) => v, withSequence: (...v) => v[v.length - 1],
  cancelAnimation: () => {}, ReduceMotion: { System: "system", Always: "always", Never: "never" }, runOnJS: (f) => f, runOnUI: (f) => f,
  Easing: new Proxy({}, { get: () => () => (t) => t }),
};
for (const k of entering) m[k] = anim();
module.exports = m;
