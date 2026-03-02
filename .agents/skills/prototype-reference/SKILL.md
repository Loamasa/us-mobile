# Prototype Reference

UI/UX reference lookup from the feature-complete frontend prototype.
Use when implementing any screen, component, or UX flow to match the prototype's design.

## Workflow

1. **Read the map first**: Read `.context/prototype/prototype-map.md` to find the relevant file(s)
2. **Read only what you need**: Read 1-2 specific files from `.context/prototype/src/` based on the map
3. **Extract what matters**: Focus on layout structure, component composition, UX flows, mock data shapes, and styling patterns
4. **Adapt, don't copy**: The prototype is web (React + Leaflet). The production app is React Native + Expo. Translate patterns, don't paste code.

## When to Use

- Implementing a new screen or feature — check the prototype for UI structure and flow
- Unsure about UX behavior — check how the prototype handles it
- Need mock data shapes — check the prototype's data files or component props
- Design decisions — check the prototype for visual patterns and component composition

## Key Differences (Prototype vs Production)

| Prototype (Web) | Production (React Native) |
|----------------|--------------------------|
| Leaflet maps | react-native-maps |
| CSS / Tailwind web | NativeWind v4 className |
| localStorage | AsyncStorage / Firestore |
| React context mock state | Firebase + real-time listeners |
| All features | MVP subset |
